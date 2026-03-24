"use client";

interface Deployment {
  uid: string;
  name: string;
  url: string;
  state: string;
  created: number;
}

const stateColors: Record<string, string> = {
  READY: "text-success",
  ERROR: "text-danger",
  BUILDING: "text-warning",
  QUEUED: "text-slate-400",
  CANCELED: "text-slate-600",
};

const stateLabels: Record<string, string> = {
  READY: "Live",
  ERROR: "Failed",
  BUILDING: "Building",
  QUEUED: "Queued",
  CANCELED: "Canceled",
};

export default function DeploymentList({ deployments }: { deployments: Deployment[] }) {
  if (deployments.length === 0) {
    return (
      <div className="text-slate-500 text-sm p-4">No deployments found.</div>
    );
  }

  return (
    <div className="space-y-2">
      {deployments.map((d) => (
        <div key={d.uid} className="flex items-center justify-between p-3 rounded-lg bg-base/50 hover:bg-base-card/50 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-2 h-2 rounded-full ${d.state === "READY" ? "bg-success" : d.state === "ERROR" ? "bg-danger" : "bg-warning"}`} />
            <div className="min-w-0">
              <span className="text-sm text-white font-mono truncate block">{d.name}</span>
              <span className="text-xs text-slate-500">
                {new Date(d.created).toLocaleString()}
              </span>
            </div>
          </div>
          <span className={`text-xs font-mono font-semibold ${stateColors[d.state] || "text-slate-400"}`}>
            {stateLabels[d.state] || d.state}
          </span>
        </div>
      ))}
    </div>
  );
}
