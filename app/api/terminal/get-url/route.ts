import { NextRequest, NextResponse } from "next/server";
import WebSocket from "ws";

export const maxDuration = 15; // Vercel serverless timeout

// Fetches the ttyd HTML page to extract auth token (if auth is enabled)
async function getTtydAuthToken(ttydUrl: string): Promise<string | null> {
  try {
    const res = await fetch(ttydUrl, {
      headers: { Accept: "text/html" },
      redirect: "follow",
    });
    const html = await res.text();
    // ttyd puts auth token in: <meta name="auth_token" content="TOKEN">
    const match = html.match(
      /name=["']auth_token["']\s+content=["']([^"']+)["']/
    );
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

// Runs a command on the droplet via ttyd WebSocket and returns the output
function runOnDroplet(
  ttydUrl: string,
  authToken: string | null,
  command: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const wsUrl = ttydUrl
      .replace(/^https:\/\//, "wss://")
      .replace(/^http:\/\//, "ws://");
    const wsEndpoint =
      (wsUrl.endsWith("/") ? wsUrl.slice(0, -1) : wsUrl) + "/ws";

    const ws = new WebSocket(wsEndpoint, ["tty"], {
      headers: { Origin: ttydUrl },
    });

    let output = "";
    let shellReady = false;
    let commandSent = false;
    const startMarker = "___OAUTH_START___";
    const endMarker = "___OAUTH_END___";
    let timeoutId: ReturnType<typeof setTimeout>;

    // Timeout after 10 seconds
    timeoutId = setTimeout(() => {
      try { ws.close(); } catch { /* ignore */ }
      resolve(""); // Return empty on timeout
    }, 10000);

    ws.on("open", () => {
      // Send auth token if needed
      if (authToken) {
        ws.send(JSON.stringify({ AuthToken: authToken }));
      }
      // Wait for shell to be ready
      setTimeout(() => {
        shellReady = true;
        // Send the command wrapped in markers so we can extract the output
        const wrappedCmd = `echo ${startMarker}; ${command}; echo ${endMarker}\r`;
        ws.send("0" + wrappedCmd);
        commandSent = true;
      }, 1500);
    });

    ws.on("message", (data: WebSocket.Data) => {
      if (!shellReady) return;

      let text: string;
      if (data instanceof Buffer) {
        const cmd = String.fromCharCode(data[0]);
        if (cmd !== "0") return; // Only process output
        text = data.slice(1).toString("utf-8");
      } else if (typeof data === "string") {
        if (data[0] !== "0") return;
        text = data.slice(1);
      } else {
        return;
      }

      // Strip ANSI escape codes
      text = text
        .replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, "")
        .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, "")
        .replace(/\x1b[()][A-Z0-9]/g, "");

      output += text;

      // Check if we have the complete output between markers
      if (commandSent && output.includes(endMarker)) {
        clearTimeout(timeoutId);
        // Extract content between markers
        const startIdx = output.indexOf(startMarker);
        const endIdx = output.indexOf(endMarker);
        if (startIdx !== -1 && endIdx !== -1) {
          const result = output.slice(startIdx + startMarker.length, endIdx).trim();
          // Send exit and close
          try {
            ws.send("0exit\r");
          } catch { /* ignore */ }
          setTimeout(() => {
            try { ws.close(); } catch { /* ignore */ }
          }, 200);
          resolve(result);
        } else {
          try { ws.close(); } catch { /* ignore */ }
          resolve("");
        }
      }
    });

    ws.on("error", () => {
      clearTimeout(timeoutId);
      reject(new Error("WebSocket connection failed"));
    });

    ws.on("close", () => {
      clearTimeout(timeoutId);
      resolve(output.trim());
    });
  });
}

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    // Authenticate
    const correctPassword = process.env.TERMINAL_PASSWORD;
    if (!correctPassword || password !== correctPassword) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ttydUrl = process.env.TTYD_URL;
    if (!ttydUrl) {
      return NextResponse.json(
        { error: "TTYD_URL not configured" },
        { status: 500 }
      );
    }

    // Get auth token from ttyd HTML page
    const authToken = await getTtydAuthToken(ttydUrl);

    // Run the command on the droplet
    const command = `grep -o 'https://claude\\.com/cai/oauth[^ ]*' ~/.claude_oauth_url 2>/dev/null || tmux capture-pane -p -J -t claude 2>/dev/null | grep -o 'https://claude\\.com/cai/oauth[^ ]*' | tail -1`;

    const result = await runOnDroplet(ttydUrl, authToken, command);

    // Extract URL from result
    const match = result.match(
      /https:\/\/claude\.com\/cai\/oauth\/authorize\?[^\s]+/
    );
    const url = match ? match[0] : null;

    return NextResponse.json({ url });
  } catch (error) {
    console.error("get-url error:", error);
    return NextResponse.json(
      { error: "Failed to fetch URL from droplet" },
      { status: 500 }
    );
  }
}
