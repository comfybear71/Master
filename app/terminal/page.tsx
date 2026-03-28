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

  // OAuth URL detection state
  const [oauthUrl, setOauthUrl] = useState("");
  const [monitorStatus, setMonitorStatus] = useState<
    "idle" | "connecting" | "watching" | "found"
  >("idle");
  const oauthFoundRef = useRef(false);

  // WebSocket monitor refs
  const monitorWsRef = useRef<WebSocket | null>(null);
  const monitorIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const outputBufferRef = useRef("");

  // API polling ref
  const apiPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Helper: set the found URL and stop all monitors
  const setFoundUrl = useCallback((url: string) => {
    if (oauthFoundRef.current) return;
    oauthFoundRef.current = true;
    setOauthUrl(url);
    setMonitorStatus("found");
    // Stop WebSocket monitor
    if (monitorIntervalRef.current) {
      clearInterval(monitorIntervalRef.current);
      monitorIntervalRef.current = null;
    }
    if (monitorWsRef.current) {
      try { monitorWsRef.current.send("0exit\r"); } catch { /* ignore */ }
      setTimeout(() => {
        try { monitorWsRef.current?.close(); } catch { /* ignore */ }
      }, 300);
    }
    // Stop API polling
    if (apiPollRef.current) {
      clearInterval(apiPollRef.current);
      apiPollRef.current = null;
    }
  }, []);

  // Extract OAuth URL from text (strips ANSI, joins lines)
  const extractOauthUrl = (text: string): string | null => {
    const clean = text
      .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "")
      .replace(/\x1b\][^\x07]*\x07/g, "")
      .replace(/[\r\n]+/g, "")
      .trim();
    const match = clean.match(
      /https:\/\/claude\.com\/cai\/oauth\/authorize\?[^\s'">]+/
    );
    return match ? match[0] : null;
  };

  // === METHOD 1: Monitor ttyd via a second WebSocket ===
  useEffect(() => {
    if (!ttydUrl || !connected || oauthFoundRef.current) return;

    const wsUrl = ttydUrl
      .replace(/^https:\/\//, "wss://")
      .replace(/^http:\/\//, "ws://");
    const wsEndpoint =
      (wsUrl.endsWith("/") ? wsUrl.slice(0, -1) : wsUrl) + "/ws";

    let ws: WebSocket;
    let shellReady = false;
    let destroyed = false;

    // Multi-method detection command:
    // 1. Try tmux (all panes, join wrapped lines)
    // 2. Try reading /tmp/claude-oauth-url (written by send-url script)
    // 3. Try recent files in ~/.claude
    const captureCmd = [
      // tmux: scan all panes with -J (join wrapped lines)
      "for p in $(tmux list-panes -a -F '#{session_name}:#{window_index}.#{pane_index}' 2>/dev/null); do " +
        "tmux capture-pane -pJ -S -500 -t \"$p\" 2>/dev/null; " +
        "done 2>/dev/null | grep -oE 'https://claude\\.com/cai/oauth[^ ]+' | tail -1",
      // Fallback: check known file from send-url script
      "cat /tmp/claude-oauth-url 2>/dev/null | grep -oE 'https://claude\\.com/cai/oauth[^ ]+' | tail -1",
    ].join(" || ");

    const sendCheck = () => {
      if (ws.readyState === WebSocket.OPEN && !oauthFoundRef.current) {
        outputBufferRef.current = "";
        ws.send("0" + captureCmd + "\r");
      }
    };

    const parseOutput = (text: string) => {
      // Strip ANSI escape codes
      const clean = text
        .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "")
        .replace(/\x1b\][^\x07]*\x07/g, "")
        .replace(/\x1b\[[\?]?[0-9;]*[a-zA-Z]/g, "");
      outputBufferRef.current += clean;

      const match = outputBufferRef.current.match(
        /https:\/\/claude\.com\/cai\/oauth\/authorize\?[^\s'">$]+/
      );
      if (match) {
        setFoundUrl(match[0]);
      }
    };

    try {
      setMonitorStatus("connecting");
      ws = new WebSocket(wsEndpoint);
      monitorWsRef.current = ws;
      ws.binaryType = "arraybuffer";

      ws.onopen = () => {
        if (destroyed) {
          ws.close();
          return;
        }
        setMonitorStatus("watching");
        setTimeout(() => {
          if (destroyed || oauthFoundRef.current) return;
          shellReady = true;
          sendCheck();
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
          if (bytes[0] === 0x30 && bytes.length > 1) {
            parseOutput(new TextDecoder().decode(bytes.slice(1)));
          }
        } else if (typeof data === "string" && data.length > 1 && data[0] === "0") {
          parseOutput(data.slice(1));
        }
      };

      ws.onerror = () => {
        if (!oauthFoundRef.current) setMonitorStatus("watching");
      };

      ws.onclose = () => {
        if (!oauthFoundRef.current && !destroyed) setMonitorStatus("watching");
      };
    } catch {
      // WebSocket failed — API polling and clipboard are fallbacks
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
  }, [ttydUrl, connected, setFoundUrl]);

  // === METHOD 2: Poll API endpoint (works with send-url on droplet) ===
  useEffect(() => {
    if (!authenticated || !connected || oauthFoundRef.current) return;

    const termPw = sessionStorage.getItem("terminal-pw") || "";

    const poll = async () => {
      if (oauthFoundRef.current) return;
      try {
        const res = await fetch(
          `/api/terminal/oauth-url?password=${encodeURIComponent(termPw)}`
        );
        const data = await res.json();
        if (data.url && data.url.startsWith("https://claude.com/cai/oauth")) {
          setFoundUrl(data.url);
        }
      } catch {
        // Silently ignore
      }
    };

    poll();
    apiPollRef.current = setInterval(poll, 2000);

    return () => {
      if (apiPollRef.current) {
        clearInterval(apiPollRef.current);
        apiPollRef.current = null;
      }
    };
  }, [authenticated, connected, setFoundUrl]);

  // === METHOD 3: Read clipboard (works when user presses "c" in Claude Code) ===
  const readClipboardForUrl = async (): Promise<string | null> => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.includes("claude.com/cai/oauth")) {
        return extractOauthUrl(text);
      }
    } catch {
      // Clipboard API not available or permission denied
    }
    return null;
  };

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
    oauthFoundRef.current = false;
    setOauthUrl("");
    setMonitorStatus("idle");
    const termPw = sessionStorage.getItem("terminal-pw") || "";
    fetch(`/api/terminal/oauth-url?password=${encodeURIComponent(termPw)}`, {
      method: "DELETE",
    }).catch(() => {});
  }, []);

  const handleIframeLoad = () => {
    setConnected(true);
  };

  // "Go" button: if no URL yet, try clipboard first
  const handleGoClick = async () => {
    let url = oauthUrl;
    if (!url) {
      const clipUrl = await readClipboardForUrl();
      if (clipUrl) {
        url = clipUrl;
        setFoundUrl(url);
      }
    }
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  // "Paste" button: read clipboard with user gesture (works on iPad)
  const handlePasteClick = async () => {
    const clipUrl = await readClipboardForUrl();
    if (clipUrl) {
      setFoundUrl(clipUrl);
    } else {
      // Try reading whatever is in clipboard
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          // Clean up multi-line paste and check for partial URL
          const cleaned = text.replace(/[\r\n]+/g, "").trim();
          const url = extractOauthUrl(cleaned);
          if (url) {
            setFoundUrl(url);
          } else {
            setOauthUrl(cleaned);
          }
        }
      } catch {
        // Clipboard not available
      }
    }
  };

  const resetOauthMonitor = () => {
    oauthFoundRef.current = false;
    setOauthUrl("");
    setMonitorStatus("watching");
    const termPw = sessionStorage.getItem("terminal-pw") || "";
    fetch(`/api/terminal/oauth-url?password=${encodeURIComponent(termPw)}`, {
      method: "DELETE",
    }).catch(() => {});
  };

  // Smart paste handler for the input field
  const handleInputPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text");
    // Join lines — iPad copies single lines from wrapped terminal text
    const cleaned = pasted.replace(/[\r\n]+/g, "").trim();
    const url = extractOauthUrl(cleaned);
    if (url) {
      setFoundUrl(url);
    } else {
      setOauthUrl(cleaned);
    }
  };

  if (checking) return null;

  // Mobile phone message
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
            <span className="text-accent font-mono">masterhq.dev/terminal</span>{" "}
            on your iPad or computer for the full terminal experience.
          </p>
          <a href="/" className="text-accent text-sm hover:underline">
            ← Back to Dashboard
          </a>
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

  // Terminal view
  const terminalUrl = ttydUrl || "";

  return (
    <div className="flex flex-col h-screen">
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
              className={`w-2 h-2 rounded-full ${connected ? "bg-success animate-pulse-live" : "bg-danger"}`}
            />
            <span
              className={`text-xs font-mono ${connected ? "text-success" : "text-danger"}`}
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

      {/* OAuth URL bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#0d1424] border-b border-slate-800 shrink-0">
        {/* Status indicator */}
        {monitorStatus === "watching" && (
          <div
            className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0"
            title="Watching for OAuth URL..."
          />
        )}
        {monitorStatus === "found" && (
          <div
            className="w-2 h-2 rounded-full bg-success shrink-0"
            title="OAuth URL detected"
          />
        )}
        {(monitorStatus === "idle" || monitorStatus === "connecting") &&
          connected && (
            <div
              className="w-2 h-2 rounded-full bg-slate-600 shrink-0"
              title="Starting monitor..."
            />
          )}

        {/* URL input */}
        <input
          type="text"
          value={oauthUrl}
          onChange={(e) => setOauthUrl(e.target.value)}
          onPaste={handleInputPaste}
          placeholder={
            monitorStatus === "found"
              ? "URL detected!"
              : "Press c in Claude Code, then tap Paste"
          }
          className="flex-1 min-w-0 bg-[#111827] border border-slate-700 rounded px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-accent focus:outline-none font-mono"
        />

        {/* Paste from clipboard button — the primary way on iPad */}
        <button
          onClick={handlePasteClick}
          className="px-3 py-1.5 bg-slate-700 text-slate-200 rounded text-xs font-bold font-mono hover:bg-slate-600 transition-colors shrink-0"
          title="Read OAuth URL from clipboard"
        >
          Paste
        </button>

        {/* Go button */}
        <button
          onClick={handleGoClick}
          disabled={!oauthUrl}
          className={`px-4 py-1.5 rounded text-xs font-bold font-mono transition-colors shrink-0 ${
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
            X
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
            <h2 className="text-lg font-bold text-white mb-2">
              TTYD_URL not configured
            </h2>
            <p className="text-sm text-slate-400 max-w-md">
              Add <code className="text-accent">TTYD_URL</code> to your Vercel
              environment variables. Follow the setup guide at{" "}
              <span className="text-accent">docs/ttyd-setup.md</span>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
