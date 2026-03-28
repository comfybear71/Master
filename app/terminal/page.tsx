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
  const [oauthUrl, setOauthUrl] = useState<string | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem("terminal-auth");
    if (saved === "true") {
      setAuthenticated(true);
    }
    setChecking(false);
  }, []);

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

  const handlePasteOauthUrl = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && (text.includes("claude.com/cai/oauth") || text.includes("claude.ai/cai/oauth")) && text.length > 100) {
        const fixed = text.replace("https://claude.com/", "https://claude.ai/");
        setOauthUrl(fixed);
      }
    } catch {}
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
  }, []);

  const handleIframeLoad = () => setConnected(true);
  const handleOauthOpen = () => { if (oauthUrl) window.open(oauthUrl, "_blank"); };
  const handleOauthDismiss = () => setOauthUrl(null);

  if (checking) return null;

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

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-base-card rounded-xl border border-slate-800 p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="text-3xl mb-3">🔐</div>
            <h1 className="text-lg font-bold text-white">MasterHQ Terminal</h1>
            <p className="text-xs text-slate-500 mt-1">Connect to your droplet from anywhere — including iPad</p>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); handleAuth(); }}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Terminal password"
              autoFocus
              className="w-full bg-base border border-slate-700 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-accent focus:outline-none font-mono mb-3"
            />
            {authError && <p className="text-xs text-danger mb-3 font-mono">{authError}</p>}
            <button type="submit" className="w-full py-3 bg-accent text-black font-bold rounded-lg text-sm hover:bg-accent/80 transition-colors font-mono">
              Connect
            </button>
          </form>
          <a href="/" className="block text-center text-xs text-slate-500 mt-4 hover:text-slate-300">← Back to Dashboard</a>
        </div>
      </div>
    );
  }

  const terminalUrl = ttydUrl || "";

  return (
    <div className="flex flex-col h-screen">
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
          <button onClick={reconnect} className="px-3 py-1 bg-slate-800 text-slate-300 rounded text-xs font-mono hover:bg-slate-700 transition-colors">
            Reconnect
          </button>
        </div>
      </div>

      {oauthUrl && (
        <div className="shrink-0 bg-yellow-900/80 border-b border-yellow-600 px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-yellow-400 text-lg shrink-0">🔑</span>
            <div className="min-w-0">
              <p className="text-yellow-200 text-xs font-mono font-bold">Claude Code login URL detected!</p>
              <p className="text-yellow-400 text-xs font-mono truncate">{oauthUrl.slice(0, 80)}...</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={handleOauthOpen} className="px-4 py-2 bg-yellow-500 text-black font-bold rounded text-xs font-mono hover:bg-yellow-400 transition-colors">
              Open Login →
            </button>
            <button onClick={handleOauthDismiss} className="px-3 py-2 bg-slate-700 text-slate-300 rounded text-xs font-mono hover:bg-slate-600 transition-colors">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {!oauthUrl && connected && (
        <div className="shrink-0 bg-slate-900 border-b border-slate-700 px-4 py-2 flex items-center gap-2">
          <span className="text-slate-500 text-xs font-mono">💡 When Claude Code shows a login URL, type</span>
          <code className="text-accent text-xs font-mono bg-slate-800 px-2 py-0.5 rounded">c</code>
          <span className="text-slate-500 text-xs font-mono">to copy it, then tap:</span>
          <button onClick={handlePasteOauthUrl} className="px-3 py-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded text-xs font-mono hover:bg-yellow-500/30 transition-colors">
            Paste Login URL
          </button>
        </div>
      )}

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
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
