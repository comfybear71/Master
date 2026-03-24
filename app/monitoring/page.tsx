"use client";

import { useEffect, useState } from "react";
import DeploymentList from "@/components/dashboard/DeploymentList";

interface Deployment {
  uid: string;
  name: string;
  url: string;
  state: string;
  created: number;
}

export default function MonitoringPage() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeployments = async () => {
      try {
        const res = await fetch("/api/vercel?action=deployments");
        if (res.ok) {
          const data = await res.json();
          setDeployments(Array.isArray(data) ? data : []);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    fetchDeployments();
    const interval = setInterval(fetchDeployments, 60000);
    return () => clearInterval(interval);
  }, []);

  const errors = deployments.filter((d) => d.state === "ERROR");
  const ready = deployments.filter((d) => d.state === "READY");
  const building = deployments.filter((d) => d.state === "BUILDING");

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">Monitoring</h1>
      <p className="text-sm text-slate-500 mb-8">Deployment status and error tracking</p>

      {loading ? (
        <div className="text-accent font-mono animate-pulse p-8 text-center">Loading...</div>
      ) : (
        <>
          {/* Status summary */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-base-card rounded-xl border border-success/20 p-4 text-center">
              <div className="text-3xl font-bold font-mono text-success">{ready.length}</div>
              <div className="text-xs text-slate-400 mt-1">Live</div>
            </div>
            <div className="bg-base-card rounded-xl border border-danger/20 p-4 text-center">
              <div className="text-3xl font-bold font-mono text-danger">{errors.length}</div>
              <div className="text-xs text-slate-400 mt-1">Errors</div>
            </div>
            <div className="bg-base-card rounded-xl border border-warning/20 p-4 text-center">
              <div className="text-3xl font-bold font-mono text-warning">{building.length}</div>
              <div className="text-xs text-slate-400 mt-1">Building</div>
            </div>
          </div>

          {/* Error list */}
          {errors.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-danger mb-3">Failed Deployments</h2>
              <div className="bg-base-card rounded-xl border border-danger/20 p-4">
                <DeploymentList deployments={errors} />
              </div>
            </div>
          )}

          {/* All deployments */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-3">All Deployments</h2>
            <div className="bg-base-card rounded-xl border border-slate-800 p-4">
              <DeploymentList deployments={deployments} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
