"use client";

import { useEffect, useState, useCallback } from "react";
import StatsCard from "@/components/dashboard/StatsCard";
import ProjectCard from "@/components/dashboard/ProjectCard";
import CommitFeed from "@/components/dashboard/CommitFeed";
import DeploymentList from "@/components/dashboard/DeploymentList";
import { Project, DetectedError, SocialStats, SocialPlatform } from "@/lib/types";

const platformIcons: Record<SocialPlatform, string> = {
  x: "\ud835\udd4f", youtube: "\u25b6", facebook: "f", instagram: "\u25ce", tiktok: "\u266a",
};

interface Commit {
  repo: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

interface Deployment {
  uid: string;
  name: string;
  url: string;
  state: string;
  created: number;
}

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [errors, setErrors] = useState<DetectedError[]>([]);
  const [socialStats, setSocialStats] = useState<SocialStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    try {
      const [projRes, deployRes, errRes, socialRes] = await Promise.allSettled([
        fetch("/api/projects"),
        fetch("/api/vercel?action=deployments"),
        fetch("/api/errors"),
        fetch("/api/social?action=cached"),
      ]);

      if (projRes.status === "fulfilled" && projRes.value.ok) {
        const data = await projRes.value.json();
        setProjects(Array.isArray(data) ? data : []);
      }

      if (deployRes.status === "fulfilled" && deployRes.value.ok) {
        const data = await deployRes.value.json();
        setDeployments(Array.isArray(data) ? data : []);
      }

      if (errRes.status === "fulfilled" && errRes.value.ok) {
        const data = await errRes.value.json();
        setErrors(Array.isArray(data) ? data.filter((e: DetectedError) => e.status !== "dismissed" && e.status !== "fix_applied") : []);
      }

      if (socialRes.status === "fulfilled" && socialRes.value.ok) {
        const data = await socialRes.value.json();
        setSocialStats(Array.isArray(data) ? data : []);
      }

      // Fetch recent commits from registered project repos
      if (projRes.status === "fulfilled" && projRes.value.ok) {
        const projs: Project[] = await (projRes.value.clone()).json().catch(() => []);
        const repoList = projs.filter((p) => p.repo).map((p) => p.repo);
        const allCommits: Commit[] = [];

        const commitResults = await Promise.allSettled(
          repoList.slice(0, 6).map((repo) =>
            fetch(`/api/github?action=commits&repo=${encodeURIComponent(repo)}`)
              .then((r) => (r.ok ? r.json() : []))
              .then((data: Array<{ sha: string; commit: { message: string; author: { name: string; date: string } }; html_url: string }>) =>
                (Array.isArray(data) ? data : []).map((c) => ({
                  repo,
                  message: c.commit?.message?.split("\n")[0] || "",
                  author: c.commit?.author?.name || "",
                  date: c.commit?.author?.date || "",
                  url: c.html_url || "",
                }))
              )
          )
        );
        for (const r of commitResults) {
          if (r.status === "fulfilled") allCommits.push(...r.value);
        }
        allCommits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setCommits(allCommits.slice(0, 15));
      }

      setLastRefresh(new Date());
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const readyDeploys = deployments.filter((d) => d.state === "READY").length;
  const errorDeploys = deployments.filter((d) => d.state === "ERROR").length;
  const buildingDeploys = deployments.filter((d) => d.state === "BUILDING").length;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Last refresh: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-accent/10 text-accent border border-accent/20 rounded-lg text-sm hover:bg-accent/20 transition-colors font-mono"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-accent font-mono animate-pulse">Loading TheMaster...</div>
        </div>
      ) : (
        <>
          {/* Error Alert Banner */}
          {errors.length > 0 && (
            <div className="mb-6 bg-danger/5 border border-danger/20 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-danger animate-pulse-live" />
                  <div>
                    <h3 className="text-sm font-semibold text-danger">
                      {errors.length} Active Error{errors.length > 1 ? "s" : ""} Detected
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {errors.map((e) => e.projectName).filter((v, i, a) => a.indexOf(v) === i).join(", ")}
                    </p>
                  </div>
                </div>
                <a href="/monitoring" className="px-3 py-1.5 bg-danger/10 text-danger border border-danger/20 rounded-lg text-xs hover:bg-danger/20 transition-colors font-mono">
                  View & Fix →
                </a>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <StatsCard label="Total Projects" value={projects.length} icon="◈" color="accent" />
            <StatsCard label="Live Deployments" value={readyDeploys} icon="▲" color="success" />
            <StatsCard label="Failed" value={errorDeploys} icon="✕" color="danger" />
            <StatsCard label="Building" value={buildingDeploys} icon="⟐" color="warning" />
            <StatsCard label="Active Errors" value={errors.length} icon="!" color={errors.length > 0 ? "danger" : "success"} />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Projects Column */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Registered Projects</h2>
                <a href="/projects" className="text-xs text-accent hover:underline">
                  Manage →
                </a>
              </div>
              {projects.length === 0 ? (
                <div className="bg-base-card rounded-xl border border-slate-800 p-8 text-center">
                  <p className="text-slate-400 mb-3">No projects registered yet.</p>
                  <a href="/projects" className="text-accent text-sm hover:underline">
                    Add your first project →
                  </a>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projects.map((p) => (
                    <ProjectCard key={String(p._id)} project={p} />
                  ))}
                </div>
              )}
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">
              {/* Deployments */}
              <div className="bg-base-card rounded-xl border border-slate-800 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white">Recent Deployments</h3>
                  <a href="/monitoring" className="text-xs text-accent hover:underline">All →</a>
                </div>
                <DeploymentList deployments={deployments.slice(0, 8)} />
              </div>

              {/* Social Media Followers */}
              <div className="bg-base-card rounded-xl border border-slate-800 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white">Social Media</h3>
                  <a href="/growth" className="text-xs text-accent hover:underline">Growth →</a>
                </div>
                {socialStats.length > 0 ? (
                  <div className="space-y-2">
                    {socialStats.map((s) => (
                      <div key={s.platform} className="flex items-center justify-between py-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{platformIcons[s.platform]}</span>
                          <span className="text-xs text-slate-400 capitalize">{s.platform === "x" ? "X/Twitter" : s.platform}</span>
                        </div>
                        <span className={`text-xs font-mono ${s.error ? "text-slate-600" : "text-white"}`}>
                          {s.error ? "—" : s.followers.toLocaleString()}
                        </span>
                      </div>
                    ))}
                    <div className="border-t border-slate-800 pt-2 mt-2 flex justify-between">
                      <span className="text-xs text-slate-500">Total</span>
                      <span className="text-xs font-mono text-accent font-semibold">
                        {socialStats.reduce((s, p) => s + (p.followers || 0), 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Configure social accounts in Growth page.</p>
                )}
              </div>

              {/* Commit Feed */}
              <div className="bg-base-card rounded-xl border border-slate-800 p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Commit Feed</h3>
                <CommitFeed commits={commits.slice(0, 8)} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
