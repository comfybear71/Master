"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export default function TerminalPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [checking, setChecking] = useState(true);
  const [connected, setConnected] = useState(false);
  const [ttydUrl, setTtydUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  // OAuth URL auto-detection
  const [oauthUrl, setOauthUrl] = useState("");
  const [monitorStatus, setMonitorStatus] = useState<"idle" | "connecting" | "watching" | "found">("idle");
  const monitorWsRef = useRef<WebSocket | null>(null);
  const monitorIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const outputBufferRef = useRef("");
  const oauthFoundRef = useRef(false);

  // Check device size
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Check if already authenticated this session
  useEffect(() => {
    const saved = sessionStorage.getItem("terminal-auth");
    if (saved === "true") {
      setAuthenticated(true);
    }
    setChecking(false);
  }, []);

  // Get TTYD_URL from env (via a simple check)
  useEffect(() => {
    if (authenticated) {
      fetch("/api/terminal/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: sessionStorage.getItem("terminal-pw") || "" }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.ttydUrl) setTtydUrl(data.ttydUrl);
        })
        .catch(() => {});
    }
  }, [authenticated]);

  // Monitor ttyd via a second WebSocket for OAuth URLs
  useEffect(() => {
    if (!ttydUrl || !connected || oauthFoundRef.current) return;

    // Build WebSocket URL from ttyd HTTPS URL
    const wsUrl = ttydUrl.replace(/^https:\/\//, "wss://").replace(/^http:\/\//, "ws://");
    const wsEndpoint = (wsUrl.endsWith("/") ? wsUrl.slice(0, -1) : wsUrl) + "/ws";

    let ws: WebSocket;
    let shellReady = false;
    let destroyed = false;

    const sendCheck = () => {
      if (ws.readyState === WebSocket.OPEN && !oauthFoundRef.current) {
        outputBufferRef.current = "";
        // Check all tmux sessions for OAuth URL, with scrollback history
        ws.send(
          "0" +
            "tmux capture-pane -p -S -3000 -t claude 2>/dev/null | grep -oE 'https://claude\\.com/cai/oauth[^ ]+' | tail -1\r"
        );
      }
    };

    const parseOutput = (text: string) => {
      // Strip ANSI escape codes
      const clean = text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "").replace(/\x1b\][^\x07]*\x07/g, "");
      outputBufferRef.current += clean;

      // Look for OAuth URL in accumulated output
      const match = outputBufferRef.current.match(
        /https:\/\/claude\.com\/cai\/oauth[^\s'">]+/
      );
      if (match) {
        const url = match[0];
        setOauthUrl(url);
        setMonitorStatus("found");
        oauthFoundRef.current = true;
        // Stop polling
        if (monitorIntervalRef.current) {
          clearInterval(monitorIntervalRef.current);
          monitorIntervalRef.current = null;
        }
        // Clean up: exit the monitoring shell and close
        try {
          ws.send("0exit\r");
        } catch {
          // ignore
        }
        setTimeout(() => {
          try { ws.close(); } catch { /* ignore */ }
        }, 500);
      }
    };

    try {
      setMonitorStatus("connecting");
      ws = new WebSocket(wsEndpoint);
      monitorWsRef.current = ws;
      ws.binaryType = "arraybuffer";

      ws.onopen = () => {
        if (destroyed) { ws.close(); return; }
        setMonitorStatus("watching");
        // Wait for shell prompt to be ready
        setTimeout(() => {
          if (destroyed || oauthFoundRef.current) return;
          shellReady = true;
          sendCheck();
          // Poll every 3 seconds
          monitorIntervalRef.current = setInterval(() => {
            if (!oauthFoundRef.current) sendCheck();
          }, 3000);
        }, 2000);
      };

      ws.onmessage = (event: MessageEvent) => {
        if (!shellReady || oauthFoundRef.current || destroyed) return;
        const data = event.data;
        if (data instanceof ArrayBuffer) {
          const bytes = new Uint8Array(data);
          // ttyd protocol: first byte 0x30 ('0') = terminal output
          if (bytes[0] === 0x30 && bytes.length > 1) {
            const text = new TextDecoder().decode(bytes.slice(1));
            parseOutput(text);
          }
        }
      };

      ws.onerror = () => {
        if (!oauthFoundRef.current) setMonitorStatus("idle");
      };

      ws.onclose = () => {
        if (!oauthFoundRef.current && !destroyed) setMonitorStatus("idle");
      };
    } catch {
      setMonitorStatus("idle");
    }

    return () => {
      destroyed = true;
      if (monitorIntervalRef.current) {
        clearInterval(monitorIntervalRef.current);
        monitorIntervalRef.current = null;
      }
      if (monitorWsRef.current) {
        try { monitorWsRef.current.close(); } catch { /* ignore */ }
        monitorWsRef.current = null;
      }
    };
  }, [ttydUrl, connected]);

  const handleAuth = async () => {
    setAuthError("");
    try {
      const res = await fetch("/api/terminal/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.success) {
        setAuthenticated(true);
        sessionStorage.setItem("terminal-auth", "true");
        sessionStorage.setItem("terminal-pw", password);
        if (data.ttydUrl) setTtydUrl(data.ttydUrl);
      } else {
        setAuthError(data.error || "Invalid password");
      }
    } catch {
      setAuthError("Connection failed");
    }
  };

  const reconnect = useCallback(() => {
    setConnected(false);
    setIframeKey((k) => k + 1);
    // Reset OAuth monitoring
    oauthFoundRef.current = false;
    setOauthUrl("");
    setMonitorStatus("idle");
  }, []);

  const handleIframeLoad = () => {
    setConnected(true);
  };

  const handleGoClick = () => {
    if (oauthUrl) {
      window.open(oauthUrl, "_blank", "noopener,noreferrer");
    }
  };

  const resetOauthMonitor = () => {
    oauthFoundRef.current = false;
    setOauthUrl("");
    setMonitorStatus("idle");
  };

  if (checking) return null;

  // Mobile phone message
  if (isMobile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 text-center">
        <div>
          <div className="text-5xl mb-4">🖥️</div>
          <h1 className="text-xl font-bold text-white mb-3">Terminal works best on iPad or desktop</h1>
          <p className="text-slate-400 text-sm mb-6">
            Open <span className="text-accent font-mono">masterhq.dev/terminal</span> on your iPad or computer for the full terminal experience.
          </p>
          <a href="/" className="text-accent text-sm hover:underline">← Back to Dashboard</a>
        </div>
      </div>
    );
  }

  // Password gate
  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-base-card rounded-xl border border-slate-800 p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="text-3xl mb-3">🔐</div>
            <h1 className="text-lg font-bold text-white">MasterHQ Terminal</h1>
            <p className="text-xs text-slate-500 mt-1">Connect to your droplet from anywhere — including iPad</p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAuth();
            }}
          >
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Terminal password"
              autoFocus
              className="w-full bg-base border border-slate-700 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-accent focus:outline-none font-mono mb-3"
            />
            {authError && (
              <p className="text-xs text-danger mb-3 font-mono">{authError}</p>
            )}
            <button
              type="submit"
              className="w-full py-3 bg-accent text-black font-bold rounded-lg text-sm hover:bg-accent/80 transition-colors font-mono"
            >
              Connect
            </button>
          </form>
          <a href="/" className="block text-center text-xs text-slate-500 mt-4 hover:text-slate-300">
            ← Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // Terminal view
  const terminalUrl = ttydUrl || "";

  return (
    <div className="flex flex-col h-screen">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-base-light border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <a href="/" className="text-slate-500 hover:text-accent text-xs font-mono">← Dashboard</a>
          <span className="text-slate-700">|</span>
          <span className="text-sm font-bold text-white font-mono">🖥️ MasterHQ Terminal</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connected ? "bg-success animate-pulse-live" : "bg-danger"}`} />
            <span className={`text-xs font-mono ${connected ? "text-success" : "text-danger"}`}>
              {connected ? "Connected" : "Disconnected"}
            </span>
          </div>
          <span className="text-xs text-slate-500 font-mono hidden md:inline">terminal.masterhq.dev</span>
          <button
            onClick={reconnect}
            className="px-3 py-1 bg-slate-800 text-slate-300 rounded text-xs font-mono hover:bg-slate-700 transition-colors"
          >
            Reconnect
          </button>
        </div>
      </div>

      {/* OAuth URL bar — auto-detects OAuth URLs from Claude Code in the terminal */}
      <div className="flex items-center gap-2 px-4 py-2 bg-[#0d1424] border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2 flex-1">
          {monitorStatus === "watching" && (
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" title="Watching for OAuth URL..." />
          )}
          {monitorStatus === "found" && (
            <div className="w-2 h-2 rounded-full bg-success shrink-0" title="OAuth URL detected" />
          )}
          {monitorStatus === "idle" && connected && (
            <div className="w-2 h-2 rounded-full bg-slate-600 shrink-0" title="Monitor idle" />
          )}
          <input
            type="text"
            value={oauthUrl}
            onChange={(e) => setOauthUrl(e.target.value)}
            placeholder={
              monitorStatus === "watching"
                ? "Watching for OAuth URL from Claude Code..."
                : monitorStatus === "connecting"
                ? "Connecting monitor..."
                : "OAuth URL will appear here automatically"
            }
            className="flex-1 bg-[#111827] border border-slate-700 rounded px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:border-accent focus:outline-none font-mono"
          />
        </div>
        <button
          onClick={handleGoClick}
          disabled={!oauthUrl}
          className={`px-4 py-1.5 rounded text-sm font-bold font-mono transition-colors shrink-0 ${
            oauthUrl
              ? "bg-accent text-black hover:bg-accent/80 cursor-pointer"
              : "bg-slate-800 text-slate-500 cursor-not-allowed"
          }`}
        >
          Go
        </button>
        {oauthUrl && (
          <button
            onClick={resetOauthMonitor}
            className="px-2 py-1.5 text-slate-500 hover:text-slate-300 text-xs font-mono transition-colors shrink-0"
            title="Clear and re-watch"
          >
            Clear
          </button>
        )}
      </div>

      {/* Terminal iframe */}
      {terminalUrl ? (
        <iframe
          key={iframeKey}
          ref={iframeRef}
          src={terminalUrl}
          onLoad={handleIframeLoad}
          className="flex-1 w-full border-0 bg-black"
          title="Terminal"
          allow="clipboard-read; clipboard-write"
        />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-lg font-bold text-white mb-2">TTYD_URL not configured</h2>
            <p className="text-sm text-slate-400 max-w-md">
              Add <code className="text-accent">TTYD_URL</code> to your Vercel environment variables.
              Follow the setup guide at <span className="text-accent">docs/ttyd-setup.md</span>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
