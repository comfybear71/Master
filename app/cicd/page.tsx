"use client";

import { useEffect, useState } from "react";
import { Project } from "@/lib/types";

interface VercelProject {
  id: string;
  name: string;
  framework: string | null;
}

export default function CICDPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [vercelProjects, setVercelProjects] = useState<VercelProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [projRes, vercelRes] = await Promise.allSettled([
        fetch("/api/projects"),
        fetch("/api/vercel?action=projects"),
      ]);
      if (projRes.status === "fulfilled" && projRes.value.ok) {
        setProjects(await projRes.value.json());
      }
      if (vercelRes.status === "fulfilled" && vercelRes.value.ok) {
        setVercelProjects(await vercelRes.value.json());
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">CI/CD</h1>
      <p className="text-sm text-slate-500 mb-8">Deployment controls for all projects</p>

      {loading ? (
        <div className="text-accent font-mono animate-pulse p-8 text-center">Loading...</div>
      ) : (
        <div className="space-y-4">
          {/* Vercel projects */}
          <h2 className="text-lg font-semibold text-white">Vercel Projects</h2>
          {vercelProjects.length === 0 ? (
            <p className="text-slate-500 text-sm">No Vercel projects found. Add your VERCEL_TOKEN to .env.local.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vercelProjects.map((vp) => (
                <div key={vp.id} className="bg-base-card rounded-xl border border-slate-800 p-5">
                  <h3 className="font-semibold text-white mb-1">{vp.name}</h3>
                  <p className="text-xs text-slate-500 font-mono">{vp.framework || "Unknown framework"}</p>
                  <p className="text-xs text-slate-600 mt-2 font-mono">ID: {vp.id}</p>
                </div>
              ))}
            </div>
          )}

          {/* Registered projects */}
          <h2 className="text-lg font-semibold text-white mt-8">Registered Projects</h2>
          <div className="bg-base-card rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left p-3 text-slate-400 font-medium">Project</th>
                  <th className="text-left p-3 text-slate-400 font-medium">Repo</th>
                  <th className="text-left p-3 text-slate-400 font-medium">Status</th>
                  <th className="text-left p-3 text-slate-400 font-medium">Vercel ID</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={String(p._id)} className="border-b border-slate-800/50 hover:bg-base/50">
                    <td className="p-3 text-white font-medium">{p.name}</td>
                    <td className="p-3 text-slate-400 font-mono text-xs">{p.repo}</td>
                    <td className="p-3">
                      <span className={`text-xs font-mono ${p.status === "active" ? "text-success" : p.status === "broken" ? "text-danger" : "text-warning"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500 font-mono text-xs">{p.vercelProjectId || "Not linked"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
