import { NextRequest, NextResponse } from "next/server";
import WebSocket from "ws";

export const maxDuration = 15;

// Method 1: Try the nginx /oauth-url endpoint (simplest)
async function tryHttpEndpoint(ttydUrl: string): Promise<string | null> {
  try {
    const base = ttydUrl.endsWith("/") ? ttydUrl.slice(0, -1) : ttydUrl;
    const res = await fetch(`${base}/oauth-url`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const text = (await res.text()).trim();
      if (text.startsWith("https://claude.com/cai/oauth")) return text;
    }
  } catch {
    // Not set up — fall through to WebSocket
  }
  return null;
}

// Method 2: Connect to ttyd WebSocket and read the file
async function tryWebSocket(ttydUrl: string): Promise<string | null> {
  // First, get auth token from the ttyd HTML page
  let authToken: string | null = null;
  try {
    const res = await fetch(ttydUrl, {
      headers: { Accept: "text/html" },
      signal: AbortSignal.timeout(3000),
    });
    const html = await res.text();
    const match = html.match(/name=["']auth_token["']\s+content=["']([^"']+)["']/);
    authToken = match ? match[1] : null;
  } catch {
    // No auth token — try without
  }

  return new Promise((resolve) => {
    const wsUrl = ttydUrl
      .replace(/^https:\/\//, "wss://")
      .replace(/^http:\/\//, "ws://");
    const wsEndpoint = (wsUrl.endsWith("/") ? wsUrl.slice(0, -1) : wsUrl) + "/ws";

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsEndpoint, ["tty"], {
        headers: { Origin: ttydUrl },
      });
    } catch {
      return resolve(null);
    }

    let output = "";
    let ready = false;
    const MARKER = "___OAUTHURL___";

    const timeout = setTimeout(() => {
      try { ws.close(); } catch { /* */ }
      resolve(null);
    }, 8000);

    ws.on("open", () => {
      if (authToken) {
        ws.send(JSON.stringify({ AuthToken: authToken }));
      }
      setTimeout(() => {
        ready = true;
        ws.send("0" + `echo ${MARKER}; cat ~/.claude_oauth_url 2>/dev/null; echo ${MARKER}\r`);
      }, 1500);
    });

    ws.on("message", (data: WebSocket.Data) => {
      if (!ready) return;
      let text: string;
      if (Buffer.isBuffer(data)) {
        if (data[0] !== 0x30) return;
        text = data.slice(1).toString("utf-8");
      } else if (typeof data === "string") {
        if (data[0] !== "0") return;
        text = data.slice(1);
      } else {
        return;
      }

      // Strip ANSI codes
      text = text.replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, "")
        .replace(/\x1b\][^\x07]*\x07/g, "");
      output += text;

      if (output.includes(MARKER) && output.lastIndexOf(MARKER) > output.indexOf(MARKER)) {
        clearTimeout(timeout);
        const start = output.indexOf(MARKER) + MARKER.length;
        const end = output.lastIndexOf(MARKER);
        const result = output.slice(start, end).trim();
        try { ws.send("0exit\r"); } catch { /* */ }
        setTimeout(() => { try { ws.close(); } catch { /* */ } }, 200);

        const match = result.match(/https:\/\/claude\.com\/cai\/oauth[^\s]+/);
        resolve(match ? match[0] : null);
      }
    });

    ws.on("error", () => { clearTimeout(timeout); resolve(null); });
    ws.on("close", () => { clearTimeout(timeout); resolve(null); });
  });
}

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    const correctPassword = process.env.TERMINAL_PASSWORD;
    if (!correctPassword || password !== correctPassword) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ttydUrl = process.env.TTYD_URL;
    if (!ttydUrl) {
      return NextResponse.json({ error: "TTYD_URL not configured" }, { status: 500 });
    }

    // Try HTTP first (fast), then WebSocket (slower)
    const url = (await tryHttpEndpoint(ttydUrl)) || (await tryWebSocket(ttydUrl));

    return NextResponse.json({ url });
  } catch (error) {
    console.error("get-url error:", error);
    return NextResponse.json({ error: "Failed to fetch URL" }, { status: 500 });
  }
}
