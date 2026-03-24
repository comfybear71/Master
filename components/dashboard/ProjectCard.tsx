"use client";

import { Project } from "@/lib/types";

interface ProjectCardProps {
  project: Project;
}

const categoryColors: Record<string, string> = {
  ecommerce: "bg-purple-500/20 text-purple-400",
  trading: "bg-red-500/20 text-red-400",
  education: "bg-blue-500/20 text-blue-400",
  marketing: "bg-green-500/20 text-green-400",
  infrastructure: "bg-cyan-500/20 text-cyan-400",
};

const statusIndicator: Record<string, string> = {
  active: "bg-success",
  paused: "bg-warning",
  broken: "bg-danger",
};

export default function ProjectCard({ project }: ProjectCardProps) {
  return (
    <div className="bg-base-card rounded-xl border border-slate-800 p-5 hover:border-accent/30 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${statusIndicator[project.status]} animate-pulse-live`} />
          <h3 className="font-semibold text-white">{project.name}</h3>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColors[project.category] || categoryColors.infrastructure}`}>
          {project.category}
        </span>
      </div>
      <p className="text-sm text-slate-400 mb-3 line-clamp-2">{project.description}</p>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="font-mono">{project.repo}</span>
        {project.liveUrl && (
          <a
            href={project.liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            Live
          </a>
        )}
      </div>
      {project.stack && (
        <div className="mt-2 text-xs text-slate-600 font-mono">{project.stack}</div>
      )}
    </div>
  );
}
