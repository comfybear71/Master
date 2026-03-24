"use client";

import { useEffect, useState, useCallback } from "react";
import StatsCard from "@/components/dashboard/StatsCard";
import ProjectCard from "@/components/dashboard/ProjectCard";
import CommitFeed from "@/components/dashboard/CommitFeed";
import DeploymentList from "@/components/dashboard/DeploymentList";
import { Project } from "@/lib/types";

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
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    try {
      const [projRes, deployRes, ghRes] = await Promise.allSettled([
        fetch("/api/projects"),
        fetch("/api/vercel?action=deployments"),
        fetch("/api/github?action=repos"),
      ]);

      if (projRes.status === "fulfilled" && projRes.value.ok) {
        const data = await projRes.value.json();
        setProjects(Array.isArray(data) ? data : []);
      }

      if (deployRes.status === "fulfilled" && deployRes.value.ok) {
        const data = await deployRes.value.json();
        setDeployments(Array.isArray(data) ? data : []);
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
      // silently fail — dashboard shows what it can
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
    <div className="p-6 max-w-7xl mx-auto">
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
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatsCard label="Total Projects" value={projects.length} icon="◈" color="accent" />
            <StatsCard label="Live Deployments" value={readyDeploys} icon="▲" color="success" subtitle={`${errorDeploys} errors`} />
            <StatsCard label="Building" value={buildingDeploys} icon="⟐" color="warning" />
            <StatsCard label="Recent Commits" value={commits.length} icon="⬡" color="accent" subtitle="Across all repos" />
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
                <h3 className="text-sm font-semibold text-white mb-3">Recent Deployments</h3>
                <DeploymentList deployments={deployments.slice(0, 8)} />
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
