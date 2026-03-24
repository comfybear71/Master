"use client";

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: string;
  color?: "accent" | "success" | "danger" | "warning";
  subtitle?: string;
}

export default function StatsCard({ label, value, icon, color = "accent", subtitle }: StatsCardProps) {
  const colorMap = {
    accent: "text-accent border-accent/20",
    success: "text-success border-success/20",
    danger: "text-danger border-danger/20",
    warning: "text-warning border-warning/20",
  };

  return (
    <div className={`bg-base-card rounded-xl border ${colorMap[color]} p-5`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-slate-400 text-sm">{label}</span>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className={`text-3xl font-bold font-mono ${colorMap[color].split(" ")[0]}`}>
        {value}
      </div>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    </div>
  );
}
