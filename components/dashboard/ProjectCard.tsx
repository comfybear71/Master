"use client";

import { useState } from "react";
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
  finance: "bg-amber-500/20 text-amber-400",
};

const statusIndicator: Record<string, string> = {
  active: "bg-success",
  paused: "bg-warning",
  broken: "bg-danger",
};

export default function ProjectCard({ project }: ProjectCardProps) {
  const [expanded, setExpanded] = useState(false);

  const githubUrl = project.repo ? `https://github.com/${project.repo}` : null;

  return (
    <div className="bg-base-card rounded-xl border border-slate-800 hover:border-accent/30 transition-colors">
      <div className="p-5">
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
          <div className="flex items-center gap-2">
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
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-slate-500 hover:text-accent transition-colors ml-1"
              title="Quick links"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform ${expanded ? "rotate-180" : ""}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>
        </div>
        {project.stack && (
          <div className="mt-2 text-xs text-slate-600 font-mono">{project.stack}</div>
        )}
      </div>

      {expanded && (
        <div className="border-t border-slate-800 px-5 py-3 space-y-1.5 bg-slate-900/30">
          {project.liveUrl && (
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-slate-400 hover:text-accent transition-colors group"
            >
              <span className="text-accent/60 group-hover:text-accent">&#x2192;</span>
              <span className="font-medium text-accent/80 group-hover:text-accent">{project.liveUrl.replace(/^https?:\/\//, "")}</span>
            </a>
          )}
          {githubUrl && (
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors group"
            >
              <span className="text-slate-500 group-hover:text-white">&#x2192;</span>
              <span>GitHub Repo</span>
            </a>
          )}
          {githubUrl && (
            <a
              href={`${githubUrl}/actions`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors group"
            >
              <span className="text-slate-500 group-hover:text-white">&#x2192;</span>
              <span>GitHub Actions</span>
            </a>
          )}
          <a
            href="https://vercel.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors group"
          >
            <span className="text-slate-500 group-hover:text-white">&#x2192;</span>
            <span>Vercel Dashboard</span>
          </a>
        </div>
      )}
    </div>
  );
}
