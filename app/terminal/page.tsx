"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// Dynamic import types for xterm.js
let TerminalClass: typeof import("@xterm/xterm").Terminal | null = null;
let FitAddonClass: typeof import("@xterm/addon-fit").FitAddon | null = null;

export default function TerminalPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [checking, setChecking] = useState(true);
  const [connected, setConnected] = useState(false);
  const [ttydUrl, setTtydUrl] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [xtermReady, setXtermReady] = useState(false);

  // xterm refs
  const termContainerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<InstanceType<
    typeof import("@xterm/xterm").Terminal
  > | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitAddonRef = useRef<InstanceType<
    typeof import("@xterm/addon-fit").FitAddon
  > | null>(null);

  // OAuth URL detection
  const [oauthUrl, setOauthUrl] = useState("");
  const [oauthDetected, setOauthDetected] = useState(false);
  const oauthFoundRef = useRef(false);
  const outputBufferRef = useRef("");

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

  // Get TTYD_URL from env
  useEffect(() => {
    if (authenticated) {
      fetch("/api/terminal/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: sessionStorage.getItem("terminal-pw") || "",
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.ttydUrl) setTtydUrl(data.ttydUrl);
        })
        .catch(() => {});
    }
  }, [authenticated]);

  // Load xterm.js dynamically (client-side only)
  useEffect(() => {
    if (!authenticated || !ttydUrl) return;
    let cancelled = false;

    Promise.all([import("@xterm/xterm"), import("@xterm/addon-fit")]).then(
      ([xtermModule, fitModule]) => {
        if (cancelled) return;
        TerminalClass = xtermModule.Terminal;
        FitAddonClass = fitModule.FitAddon;
        setXtermReady(true);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [authenticated, ttydUrl]);

  // Initialize terminal when xterm.js is loaded and container is ready
  const initTerminal = useCallback(() => {
    if (
      !TerminalClass ||
      !FitAddonClass ||
      !termContainerRef.current ||
      !ttydUrl
    )
      return;

    // Cleanup previous instance
    if (xtermRef.current) {
      xtermRef.current.dispose();
      xtermRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Create xterm.js instance
    const term = new TerminalClass({
      cursorBlink: true,
      fontSize: 14,
      fontFamily:
        "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
      theme: {
        background: "#000000",
        foreground: "#e0e0e0",
        cursor: "#00d4ff",
        selectionBackground: "rgba(0, 212, 255, 0.3)",
      },
      allowProposedApi: true,
      scrollback: 5000,
    });

    const fitAddon = new FitAddonClass();
    term.loadAddon(fitAddon);
    term.open(termContainerRef.current);

    // Let DOM settle before fitting
    setTimeout(() => fitAddon.fit(), 150);

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Connect WebSocket to ttyd server
    const wsUrl = ttydUrl
      .replace(/^https:\/\//, "wss://")
      .replace(/^http:\/\//, "ws://");
    const wsEndpoint =
      (wsUrl.endsWith("/") ? wsUrl.slice(0, -1) : wsUrl) + "/ws";

    const ws = new WebSocket(wsEndpoint, ["tty"]);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      // Tell ttyd our terminal size
      const { cols, rows } = term;
      ws.send("1" + JSON.stringify({ columns: cols, rows: rows }));
    };

    ws.onmessage = (event: MessageEvent) => {
      const rawData = event.data as ArrayBuffer;
      const bytes = new Uint8Array(rawData);
      if (bytes.length === 0) return;

      const cmd = String.fromCharCode(bytes[0]);
      const payload = rawData.slice(1);

      switch (cmd) {
        case "0": {
          // Terminal output: render in xterm AND scan for OAuth URL
          const outputBytes = new Uint8Array(payload);
          term.write(outputBytes);

          // Scan raw output for OAuth URL
          if (!oauthFoundRef.current) {
            const text = new TextDecoder().decode(outputBytes);
            outputBufferRef.current += text;

            // Keep buffer manageable
            if (outputBufferRef.current.length > 100000) {
              outputBufferRef.current =
                outputBufferRef.current.slice(-50000);
            }

            // Strip all ANSI escape sequences for clean matching
            const clean = outputBufferRef.current
              .replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, "")
              .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, "")
              .replace(/\x1b[()][A-Z0-9]/g, "");

            // Match the full OAuth URL from raw stream (no line wrapping here)
            const match = clean.match(
              /https:\/\/claude\.com\/cai\/oauth\/authorize\?[^\s\x00-\x1f]+/
            );
            if (match) {
              oauthFoundRef.current = true;
              setOauthUrl(match[0]);
              setOauthDetected(true);
            }
          }
          break;
        }
        case "1":
          // Window title — ignore
          break;
        case "2":
          // Preferences from ttyd
          break;
      }
    };

    // Forward keyboard input to ttyd
    term.onData((data: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send("0" + data);
      }
    });

    // Forward binary input (special keys)
    term.onBinary((data: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        const buffer = new Uint8Array(data.length + 1);
        buffer[0] = 48; // '0'
        for (let i = 0; i < data.length; i++) {
          buffer[i + 1] = data.charCodeAt(i);
        }
        ws.send(buffer);
      }
    });

    // Forward resize events
    term.onResize(({ cols, rows }: { cols: number; rows: number }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send("1" + JSON.stringify({ columns: cols, rows: rows }));
      }
    });

    ws.onerror = () => setConnected(false);
    ws.onclose = () => setConnected(false);

    // Handle window resize
    const onResize = () => fitAddonRef.current?.fit();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, [ttydUrl]);

  // Trigger terminal init when xterm.js is loaded
  useEffect(() => {
    if (xtermReady && termContainerRef.current && ttydUrl) {
      initTerminal();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (xtermRef.current) {
        xtermRef.current.dispose();
        xtermRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xtermReady, ttydUrl]);

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
    oauthFoundRef.current = false;
    setOauthUrl("");
    setOauthDetected(false);
    outputBufferRef.current = "";
    // Re-init terminal
    setTimeout(() => initTerminal(), 100);
  }, [initTerminal]);

  // Opens the EXACT URL as detected — no domain substitution
  const handleGoClick = () => {
    if (oauthUrl) {
      window.open(oauthUrl, "_blank", "noopener,noreferrer");
    }
  };

  const resetOauth = () => {
    oauthFoundRef.current = false;
    setOauthUrl("");
    setOauthDetected(false);
    outputBufferRef.current = "";
  };

  if (checking) return null;

  if (isMobile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 text-center">
        <div>
          <div className="text-5xl mb-4">🖥️</div>
          <h1 className="text-xl font-bold text-white mb-3">
            Terminal works best on iPad or desktop
          </h1>
          <p className="text-slate-400 text-sm mb-6">
            Open{" "}
            <span className="text-accent font-mono">
              masterhq.dev/terminal
            </span>{" "}
            on your iPad or computer for the full terminal experience.
          </p>
          <a href="/" className="text-accent text-sm hover:underline">
            ← Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-base-card rounded-xl border border-slate-800 p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="text-3xl mb-3">🔐</div>
            <h1 className="text-lg font-bold text-white">MasterHQ Terminal</h1>
            <p className="text-xs text-slate-500 mt-1">
              Connect to your droplet from anywhere — including iPad
            </p>
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
          <a
            href="/"
            className="block text-center text-xs text-slate-500 mt-4 hover:text-slate-300"
          >
            ← Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-black">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-base-light border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="text-slate-500 hover:text-accent text-xs font-mono"
          >
            ← Dashboard
          </a>
          <span className="text-slate-700">|</span>
          <span className="text-sm font-bold text-white font-mono">
            🖥️ MasterHQ Terminal
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                connected ? "bg-success animate-pulse-live" : "bg-danger"
              }`}
            />
            <span
              className={`text-xs font-mono ${
                connected ? "text-success" : "text-danger"
              }`}
            >
              {connected ? "Connected" : "Disconnected"}
            </span>
          </div>
          <span className="text-xs text-slate-500 font-mono hidden md:inline">
            terminal.masterhq.dev
          </span>
          <button
            onClick={reconnect}
            className="px-3 py-1 bg-slate-800 text-slate-300 rounded text-xs font-mono hover:bg-slate-700 transition-colors"
          >
            Reconnect
          </button>
        </div>
      </div>

      {/* OAuth URL bar — auto-populated from the raw terminal data stream */}
      {oauthDetected ? (
        <div className="shrink-0 bg-yellow-900/80 border-b border-yellow-600 px-4 py-2 flex items-center gap-3">
          <span className="text-yellow-400 shrink-0">🔑</span>
          <input
            type="text"
            value={oauthUrl}
            readOnly
            className="flex-1 min-w-0 bg-yellow-950 border border-yellow-700 rounded px-3 py-1.5 text-xs text-yellow-100 font-mono truncate"
          />
          <button
            onClick={handleGoClick}
            className="px-4 py-1.5 bg-yellow-500 text-black font-bold rounded text-xs font-mono hover:bg-yellow-400 transition-colors shrink-0"
          >
            Open Login
          </button>
          <button
            onClick={resetOauth}
            className="px-2 py-1.5 text-yellow-600 hover:text-yellow-400 text-xs font-mono transition-colors shrink-0"
          >
            X
          </button>
        </div>
      ) : (
        connected && (
          <div className="shrink-0 bg-[#0d1424] border-b border-slate-800 px-4 py-2 flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0"
              title="Watching terminal output for OAuth URL..."
            />
            <span className="text-xs text-slate-500 font-mono">
              Watching terminal output for OAuth URL...
            </span>
          </div>
        )
      )}

      {/* Embedded xterm.js terminal — direct WebSocket, same origin */}
      <div
        ref={termContainerRef}
        className="flex-1 w-full"
        style={{ minHeight: 0 }}
      />

      {!ttydUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-lg font-bold text-white mb-2">
              TTYD_URL not configured
            </h2>
            <p className="text-sm text-slate-400 max-w-md">
              Add <code className="text-accent">TTYD_URL</code> to your Vercel
              environment variables.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
