"use client";

import { useEffect, useState, useCallback } from "react";
import { DetectedError, UptimeCheck, Project } from "@/lib/types";

interface Deployment {
  uid: string;
  name: string;
  url: string;
  state: string;
  created: number;
  meta?: {
    githubCommitMessage?: string;
    githubCommitRepo?: string;
  };
}

export default function MonitoringPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [errors, setErrors] = useState<DetectedError[]>([]);
  const [uptimeChecks, setUptimeChecks] = useState<UptimeCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [applying, setApplying] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchAll = useCallback(async () => {
    const [projRes, deployRes, errRes, uptimeRes] = await Promise.allSettled([
      fetch("/api/projects"),
      fetch("/api/vercel?action=deployments&limit=30"),
      fetch("/api/errors"),
      fetch("/api/uptime"),
    ]);

    if (projRes.status === "fulfilled" && projRes.value.ok) {
      setProjects(await projRes.value.json());
    }
    if (deployRes.status === "fulfilled" && deployRes.value.ok) {
      const data = await deployRes.value.json();
      setDeployments(Array.isArray(data) ? data : []);
    }
    if (errRes.status === "fulfilled" && errRes.value.ok) {
      const data = await errRes.value.json();
      setErrors(Array.isArray(data) ? data : []);
    }
    if (uptimeRes.status === "fulfilled" && uptimeRes.value.ok) {
      const data = await uptimeRes.value.json();
      setUptimeChecks(Array.isArray(data) ? data : []);
    }

    setLastRefresh(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 60000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const scanForErrors = async () => {
    setScanning(true);
    try {
      await fetch("/api/errors?action=scan", { method: "POST" });
      await fetchAll();
    } catch {
      // silently fail
    }
    setScanning(false);
  };

  const runUptimeCheck = async () => {
    try {
      await fetch("/api/uptime", { method: "POST" });
      await fetchAll();
    } catch {
      // silently fail
    }
  };

  const analyzeError = async (errorId: string) => {
    setAnalyzing(errorId);
    try {
      await fetch("/api/ai?action=analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ errorId }),
      });
      await fetchAll();
    } catch {
      // silently fail
    }
    setAnalyzing(null);
  };

  const applyFix = async (errorId: string) => {
    setApplying(errorId);
    try {
      const res = await fetch("/api/ai?action=apply-fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ errorId }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to apply fix");
      }
      await fetchAll();
    } catch {
      // silently fail
    }
    setApplying(null);
  };

  const dismissError = async (errorId: string) => {
    try {
      await fetch("/api/errors?action=dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ errorId }),
      });
      await fetchAll();
    } catch {
      // silently fail
    }
  };

  const readyDeploys = deployments.filter((d) => d.state === "READY");
  const errorDeploys = deployments.filter((d) => d.state === "ERROR");
  const buildingDeploys = deployments.filter((d) => d.state === "BUILDING");
  const activeErrors = errors.filter((e) => e.status !== "dismissed" && e.status !== "fix_applied");

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Monitoring</h1>
          <p className="text-sm text-slate-500 mt-1">
            Deployment status, error detection, and AI fix suggestions — Last: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={runUptimeCheck} className="px-4 py-2 bg-success/10 text-success border border-success/20 rounded-lg text-sm hover:bg-success/20 transition-colors font-mono">
            Check Uptime
          </button>
          <button
            onClick={scanForErrors}
            disabled={scanning}
            className="px-4 py-2 bg-danger/10 text-danger border border-danger/20 rounded-lg text-sm hover:bg-danger/20 transition-colors font-mono disabled:opacity-50"
          >
            {scanning ? "Scanning..." : "Scan for Errors"}
          </button>
          <button onClick={fetchAll} className="px-4 py-2 bg-accent/10 text-accent border border-accent/20 rounded-lg text-sm hover:bg-accent/20 transition-colors font-mono">
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-accent font-mono animate-pulse p-8 text-center">Loading monitoring data...</div>
      ) : (
        <>
          {/* Status Overview */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <StatusCard label="Projects" value={projects.length} color="accent" />
            <StatusCard label="Live" value={readyDeploys.length} color="success" />
            <StatusCard label="Errors" value={errorDeploys.length} color="danger" />
            <StatusCard label="Building" value={buildingDeploys.length} color="warning" />
            <StatusCard label="Active Issues" value={activeErrors.length} color={activeErrors.length > 0 ? "danger" : "success"} />
          </div>

          {/* Project Deployment Status Grid */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">Project Deployment Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => {
                const projectDeploys = deployments.filter(
                  (d) => d.name === project.name?.toLowerCase() ||
                    d.meta?.githubCommitRepo === project.repo ||
                    d.name === project.repo?.split("/")[1]?.toLowerCase()
                );
                const latest = projectDeploys[0];
                const uptime = uptimeChecks.find((u) => u.projectId === String(project._id));

                return (
                  <div key={String(project._id)} className="bg-base-card rounded-xl border border-slate-800 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-white text-sm">{project.name}</h3>
                      <div className="flex items-center gap-2">
                        {uptime && (
                          <span className={`w-2 h-2 rounded-full ${uptime.status === "up" ? "bg-success" : "bg-danger"} animate-pulse-live`} />
                        )}
                        <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                          latest?.state === "READY" ? "bg-success/10 text-success" :
                          latest?.state === "ERROR" ? "bg-danger/10 text-danger" :
                          latest?.state === "BUILDING" ? "bg-warning/10 text-warning" :
                          "bg-slate-700/50 text-slate-400"
                        }`}>
                          {latest?.state || "No deploys"}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 font-mono mb-2">{project.repo}</p>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{latest ? new Date(latest.created).toLocaleString() : "—"}</span>
                      {uptime?.responseTimeMs && (
                        <span className={uptime.responseTimeMs < 1000 ? "text-success" : uptime.responseTimeMs < 3000 ? "text-warning" : "text-danger"}>
                          {uptime.responseTimeMs}ms
                        </span>
                      )}
                    </div>
                    {project.liveUrl && (
                      <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline mt-1 block truncate">
                        {project.liveUrl}
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Uptime Status */}
          {uptimeChecks.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-white mb-4">Uptime Status</h2>
              <div className="bg-base-card rounded-xl border border-slate-800 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left p-3 text-slate-400 font-medium">Project</th>
                      <th className="text-left p-3 text-slate-400 font-medium">URL</th>
                      <th className="text-left p-3 text-slate-400 font-medium">Status</th>
                      <th className="text-left p-3 text-slate-400 font-medium">Response</th>
                      <th className="text-left p-3 text-slate-400 font-medium">Checked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uptimeChecks.map((check, i) => (
                      <tr key={i} className="border-b border-slate-800/50 hover:bg-base/50">
                        <td className="p-3 text-white">{check.projectName}</td>
                        <td className="p-3 text-slate-400 font-mono text-xs truncate max-w-[200px]">{check.url}</td>
                        <td className="p-3">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-mono ${check.status === "up" ? "text-success" : "text-danger"}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${check.status === "up" ? "bg-success" : "bg-danger"}`} />
                            {check.status === "up" ? "UP" : "DOWN"}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400 font-mono text-xs">
                          {check.responseTimeMs ? `${check.responseTimeMs}ms` : "—"}
                          {check.statusCode ? ` (${check.statusCode})` : ""}
                        </td>
                        <td className="p-3 text-slate-500 text-xs">{new Date(check.checkedAt).toLocaleTimeString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* AI Error Detection & Fixer */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">
              Error Detection & AI Fix Suggestions
              {activeErrors.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-danger/10 text-danger rounded-full">{activeErrors.length} active</span>
              )}
            </h2>

            {errors.length === 0 ? (
              <div className="bg-base-card rounded-xl border border-slate-800 p-8 text-center">
                <p className="text-slate-400">No errors detected. Click &quot;Scan for Errors&quot; to check all deployments.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {errors.filter((e) => e.status !== "dismissed").map((err) => (
                  <ErrorCard
                    key={String(err._id)}
                    error={err}
                    onAnalyze={() => analyzeError(String(err._id))}
                    onApplyFix={() => applyFix(String(err._id))}
                    onDismiss={() => dismissError(String(err._id))}
                    isAnalyzing={analyzing === String(err._id)}
                    isApplying={applying === String(err._id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Recent Deployments */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Recent Deployments</h2>
            <div className="bg-base-card rounded-xl border border-slate-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left p-3 text-slate-400 font-medium">Project</th>
                    <th className="text-left p-3 text-slate-400 font-medium">Status</th>
                    <th className="text-left p-3 text-slate-400 font-medium">URL</th>
                    <th className="text-left p-3 text-slate-400 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {deployments.slice(0, 20).map((d) => (
                    <tr key={d.uid} className="border-b border-slate-800/50 hover:bg-base/50">
                      <td className="p-3 text-white font-mono text-xs">{d.name}</td>
                      <td className="p-3">
                        <span className={`text-xs font-mono font-semibold ${
                          d.state === "READY" ? "text-success" :
                          d.state === "ERROR" ? "text-danger" :
                          d.state === "BUILDING" ? "text-warning" : "text-slate-400"
                        }`}>
                          {d.state}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400 font-mono text-xs truncate max-w-[200px]">
                        {d.url && (
                          <a href={`https://${d.url}`} target="_blank" rel="noopener noreferrer" className="hover:text-accent">{d.url}</a>
                        )}
                      </td>
                      <td className="p-3 text-slate-500 text-xs">{new Date(d.created).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatusCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    accent: "text-accent border-accent/20",
    success: "text-success border-success/20",
    danger: "text-danger border-danger/20",
    warning: "text-warning border-warning/20",
  };
  return (
    <div className={`bg-base-card rounded-xl border ${colorMap[color] || colorMap.accent} p-4 text-center`}>
      <div className={`text-3xl font-bold font-mono ${(colorMap[color] || colorMap.accent).split(" ")[0]}`}>{value}</div>
      <div className="text-xs text-slate-400 mt-1">{label}</div>
    </div>
  );
}

function ErrorCard({
  error,
  onAnalyze,
  onApplyFix,
  onDismiss,
  isAnalyzing,
  isApplying,
}: {
  error: DetectedError;
  onAnalyze: () => void;
  onApplyFix: () => void;
  onDismiss: () => void;
  isAnalyzing: boolean;
  isApplying: boolean;
}) {
  const [showLogs, setShowLogs] = useState(false);

  const statusColors: Record<string, string> = {
    new: "bg-danger/10 text-danger border-danger/20",
    analyzing: "bg-warning/10 text-warning border-warning/20",
    fix_ready: "bg-accent/10 text-accent border-accent/20",
    fix_applied: "bg-success/10 text-success border-success/20",
  };

  const statusLabels: Record<string, string> = {
    new: "New Error",
    analyzing: "Analyzing...",
    fix_ready: "Fix Ready",
    fix_applied: "Fixed",
  };

  return (
    <div className={`bg-base-card rounded-xl border ${error.status === "fix_applied" ? "border-success/20" : "border-danger/20"} p-5`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-white">{error.projectName}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[error.status]}`}>
              {statusLabels[error.status] || error.status}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-mono">{error.repo} — {new Date(error.detectedAt).toLocaleString()}</p>
        </div>
        <button onClick={onDismiss} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Dismiss</button>
      </div>

      {/* Error Log Preview */}
      <div className="mb-3">
        <button onClick={() => setShowLogs(!showLogs)} className="text-xs text-accent hover:underline mb-1">
          {showLogs ? "Hide error log" : "Show error log"}
        </button>
        {showLogs && (
          <pre className="bg-base rounded-lg p-3 text-xs text-danger/80 font-mono overflow-x-auto max-h-40 overflow-y-auto mt-1">
            {error.errorLog || "No error log available"}
          </pre>
        )}
      </div>

      {/* Diagnosis */}
      {error.diagnosis && (
        <div className="mb-3 bg-base rounded-lg p-3">
          <h4 className="text-xs font-semibold text-accent mb-1">AI Diagnosis</h4>
          <p className="text-sm text-slate-300">{error.diagnosis}</p>
          {error.fixFilePath && (
            <p className="text-xs text-slate-500 mt-1 font-mono">File: {error.fixFilePath}</p>
          )}
          {error.fixConfidence && (
            <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${
              error.fixConfidence === "high" ? "bg-success/10 text-success" :
              error.fixConfidence === "medium" ? "bg-warning/10 text-warning" :
              "bg-danger/10 text-danger"
            }`}>
              {error.fixConfidence} confidence
            </span>
          )}
        </div>
      )}

      {/* Suggested Fix */}
      {error.suggestedFix && error.status === "fix_ready" && (
        <div className="mb-3 bg-base rounded-lg p-3">
          <h4 className="text-xs font-semibold text-success mb-1">Suggested Fix</h4>
          <pre className="text-xs text-slate-300 font-mono overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap">
            {error.suggestedFix.slice(0, 2000)}
            {error.suggestedFix.length > 2000 && "..."}
          </pre>
        </div>
      )}

      {/* Fix Applied Info */}
      {error.status === "fix_applied" && (
        <div className="bg-success/5 rounded-lg p-3 border border-success/10">
          <p className="text-sm text-success">Fix applied successfully</p>
          {error.commitSha && <p className="text-xs text-slate-500 font-mono mt-1">Commit: {error.commitSha.slice(0, 8)}</p>}
          {error.fixAppliedAt && <p className="text-xs text-slate-500 mt-1">Applied: {new Date(error.fixAppliedAt).toLocaleString()}</p>}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 mt-3">
        {error.status === "new" && (
          <button
            onClick={onAnalyze}
            disabled={isAnalyzing}
            className="px-3 py-1.5 bg-accent/10 text-accent border border-accent/20 rounded-lg text-xs hover:bg-accent/20 transition-colors font-mono disabled:opacity-50"
          >
            {isAnalyzing ? "Analyzing..." : "Analyze with AI"}
          </button>
        )}
        {error.status === "fix_ready" && (
          <button
            onClick={onApplyFix}
            disabled={isApplying}
            className="px-3 py-1.5 bg-success/10 text-success border border-success/20 rounded-lg text-xs hover:bg-success/20 transition-colors font-mono disabled:opacity-50"
          >
            {isApplying ? "Applying..." : "Approve & Apply Fix"}
          </button>
        )}
      </div>
    </div>
  );
}
