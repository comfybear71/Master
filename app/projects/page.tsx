"use client";

import { useEffect, useState } from "react";
import { Project } from "@/lib/types";
import ProjectCard from "@/components/dashboard/ProjectCard";

const REGISTERED_REPOS = [
  { repo: "comfybear71/togogo", name: "Togogo", category: "ecommerce" as const, priority: 1, description: "Dropshipping marketplace" },
  { repo: "comfybear71/mathly", name: "Mathly", category: "education" as const, priority: 2, description: "EdTech platform" },
  { repo: "comfybear71/aiglitch", name: "AI Glitch", category: "marketing" as const, priority: 3, description: "AI social platform (backend)" },
  { repo: "comfybear71/glitch-app", name: "Glitch App", category: "marketing" as const, priority: 3, description: "AI social platform (frontend)" },
  { repo: "comfybear71/budju-xyz", name: "Budju", category: "trading" as const, priority: 4, description: "Trading platform" },
  { repo: "comfybear71/AFL-EDGE", name: "AFL Edge", category: "education" as const, priority: 5, description: "AFL predictions" },
];

interface OnboardResult {
  success: boolean;
  detected: {
    stack: string;
    category: string;
    hasCLAUDEmd: boolean;
    hasHANDOFFmd: boolean;
    vercelLinked: boolean;
    liveUrl: string;
  };
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showOnboard, setShowOnboard] = useState(false);
  const [onboardRepo, setOnboardRepo] = useState("");
  const [onboarding, setOnboarding] = useState(false);
  const [onboardResult, setOnboardResult] = useState<OnboardResult | null>(null);
  const [onboardError, setOnboardError] = useState("");
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [projectDocs, setProjectDocs] = useState<{ claudeMd: string; handoffMd: string } | null>(null);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    repo: "",
    vercelProjectId: "",
    stack: "",
    category: "infrastructure" as Project["category"],
    description: "",
    liveUrl: "",
    priority: 99,
  });

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(Array.isArray(data) ? data : []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const addProject = async (projectData: Partial<Project>) => {
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(projectData),
    });
    if (res.ok) {
      await fetchProjects();
    }
    return res.ok;
  };

  const seedProjects = async () => {
    setAdding(true);
    for (const proj of REGISTERED_REPOS) {
      const exists = projects.some((p) => p.repo === proj.repo);
      if (!exists) {
        await addProject({
          name: proj.name,
          repo: proj.repo,
          category: proj.category,
          priority: proj.priority,
          description: proj.description,
          status: "active",
        });
      }
    }
    await fetchProjects();
    setAdding(false);
  };

  const deleteProject = async (id: string) => {
    const res = await fetch(`/api/projects?id=${id}`, { method: "DELETE" });
    if (res.ok) fetchProjects();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    await addProject(formData);
    setFormData({ name: "", repo: "", vercelProjectId: "", stack: "", category: "infrastructure", description: "", liveUrl: "", priority: 99 });
    setShowForm(false);
    setAdding(false);
  };

  const handleOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboarding(true);
    setOnboardResult(null);
    setOnboardError("");

    try {
      const res = await fetch("/api/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: onboardRepo }),
      });
      const data = await res.json();
      if (res.ok) {
        setOnboardResult(data);
        await fetchProjects();
      } else {
        setOnboardError(data.error || "Onboarding failed");
      }
    } catch {
      setOnboardError("Network error during onboarding");
    }
    setOnboarding(false);
  };

  const viewProjectDocs = async (project: Project) => {
    const projectId = String(project._id);
    if (expandedProject === projectId) {
      setExpandedProject(null);
      setProjectDocs(null);
      return;
    }
    setExpandedProject(projectId);
    setLoadingDocs(true);
    setProjectDocs(null);

    try {
      const [claudeRes, handoffRes] = await Promise.allSettled([
        fetch(`/api/github?action=file&repo=${encodeURIComponent(project.repo)}&path=CLAUDE.md`),
        fetch(`/api/github?action=file&repo=${encodeURIComponent(project.repo)}&path=HANDOFF.md`),
      ]);

      let claudeMd = "";
      let handoffMd = "";
      if (claudeRes.status === "fulfilled" && claudeRes.value.ok) {
        const data = await claudeRes.value.json();
        claudeMd = data.content || "";
      }
      if (handoffRes.status === "fulfilled" && handoffRes.value.ok) {
        const data = await handoffRes.value.json();
        handoffMd = data.content || "";
      }
      setProjectDocs({ claudeMd, handoffMd });
    } catch {
      setProjectDocs({ claudeMd: "Failed to load", handoffMd: "Failed to load" });
    }
    setLoadingDocs(false);
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Project Registry</h1>
          <p className="text-sm text-slate-500 mt-1">{projects.length} projects registered</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button
            onClick={seedProjects}
            disabled={adding}
            className="px-3 sm:px-4 py-2 bg-success/10 text-success border border-success/20 rounded-lg text-xs sm:text-sm hover:bg-success/20 transition-colors font-mono disabled:opacity-50"
          >
            {adding ? "Adding..." : "Seed All"}
          </button>
          <button
            onClick={() => { setShowOnboard(!showOnboard); setShowForm(false); }}
            className="px-3 sm:px-4 py-2 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-lg text-xs sm:text-sm hover:bg-purple-500/20 transition-colors font-mono"
          >
            Plug & Play
          </button>
          <button
            onClick={() => { setShowForm(!showForm); setShowOnboard(false); }}
            className="px-3 sm:px-4 py-2 bg-accent/10 text-accent border border-accent/20 rounded-lg text-xs sm:text-sm hover:bg-accent/20 transition-colors font-mono"
          >
            + Add
          </button>
        </div>
      </div>

      {/* Plug & Play Onboarding */}
      {showOnboard && (
        <div className="bg-base-card rounded-xl border border-purple-500/20 p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-1">Plug & Play — Auto-Onboard a Project</h2>
          <p className="text-sm text-slate-400 mb-4">
            Enter a GitHub repo name. TheMaster will auto-read CLAUDE.md & HANDOFF.md, detect the stack, find the Vercel project, and start monitoring.
          </p>

          <form onSubmit={handleOnboard} className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs text-slate-500 mb-1 block">GitHub Repository</label>
              <input
                placeholder="owner/repo (e.g. comfybear71/togogo)"
                value={onboardRepo}
                onChange={(e) => setOnboardRepo(e.target.value)}
                required
                className="w-full bg-base border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-purple-400 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={onboarding}
              className="px-6 py-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg text-sm hover:bg-purple-500/30 transition-colors font-mono disabled:opacity-50 whitespace-nowrap"
            >
              {onboarding ? "Onboarding..." : "Auto-Register"}
            </button>
          </form>

          {onboardError && (
            <div className="mt-4 p-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger">
              {onboardError}
            </div>
          )}

          {onboardResult && (
            <div className="mt-4 p-4 bg-success/5 border border-success/20 rounded-lg">
              <h3 className="text-sm font-semibold text-success mb-2">Project Registered Successfully</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-500">Stack:</span>
                  <span className="ml-1 text-white font-mono">{onboardResult.detected.stack}</span>
                </div>
                <div>
                  <span className="text-slate-500">Category:</span>
                  <span className="ml-1 text-white">{onboardResult.detected.category}</span>
                </div>
                <div>
                  <span className="text-slate-500">CLAUDE.md:</span>
                  <span className={`ml-1 ${onboardResult.detected.hasCLAUDEmd ? "text-success" : "text-danger"}`}>
                    {onboardResult.detected.hasCLAUDEmd ? "Found" : "Missing"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">HANDOFF.md:</span>
                  <span className={`ml-1 ${onboardResult.detected.hasHANDOFFmd ? "text-success" : "text-danger"}`}>
                    {onboardResult.detected.hasHANDOFFmd ? "Found" : "Missing"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Vercel:</span>
                  <span className={`ml-1 ${onboardResult.detected.vercelLinked ? "text-success" : "text-warning"}`}>
                    {onboardResult.detected.vercelLinked ? "Linked" : "Not found"}
                  </span>
                </div>
                {onboardResult.detected.liveUrl && (
                  <div>
                    <span className="text-slate-500">URL:</span>
                    <a href={onboardResult.detected.liveUrl} target="_blank" rel="noopener noreferrer" className="ml-1 text-accent hover:underline">
                      {onboardResult.detected.liveUrl}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual Add Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-base-card rounded-xl border border-accent/20 p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Add New Project (Manual)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input placeholder="Project Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="bg-base border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-accent focus:outline-none" />
            <input placeholder="owner/repo" value={formData.repo} onChange={(e) => setFormData({ ...formData, repo: e.target.value })} required className="bg-base border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-accent focus:outline-none" />
            <input placeholder="Vercel Project ID (optional)" value={formData.vercelProjectId} onChange={(e) => setFormData({ ...formData, vercelProjectId: e.target.value })} className="bg-base border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-accent focus:outline-none" />
            <input placeholder="Stack (e.g. Next.js / Supabase)" value={formData.stack} onChange={(e) => setFormData({ ...formData, stack: e.target.value })} className="bg-base border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-accent focus:outline-none" />
            <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value as Project["category"] })} className="bg-base border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-accent focus:outline-none">
              <option value="ecommerce">E-commerce</option>
              <option value="trading">Trading</option>
              <option value="education">Education</option>
              <option value="marketing">Marketing</option>
              <option value="infrastructure">Infrastructure</option>
            </select>
            <input placeholder="Live URL (optional)" value={formData.liveUrl} onChange={(e) => setFormData({ ...formData, liveUrl: e.target.value })} className="bg-base border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-accent focus:outline-none" />
            <input placeholder="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="bg-base border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-accent focus:outline-none md:col-span-2" />
          </div>
          <div className="flex gap-3 mt-4">
            <button type="submit" disabled={adding} className="px-4 py-2 bg-accent text-base font-semibold rounded-lg text-sm hover:bg-accent/80 transition-colors">
              {adding ? "Adding..." : "Add Project"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-400 text-sm hover:text-white transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Project List */}
      {loading ? (
        <div className="text-accent font-mono animate-pulse p-8 text-center">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="bg-base-card rounded-xl border border-slate-800 p-12 text-center">
          <p className="text-slate-400 text-lg mb-2">No projects registered yet</p>
          <p className="text-slate-500 text-sm mb-4">Use &quot;Plug & Play&quot; to auto-onboard a repo, or &quot;Seed All Projects&quot; for your 6 registered repos.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <div key={String(p._id)} className="relative group">
                <div onClick={() => viewProjectDocs(p)} className="cursor-pointer">
                  <ProjectCard project={p} />
                </div>
                <button
                  onClick={() => deleteProject(String(p._id))}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-danger text-xs bg-base-card px-2 py-1 rounded border border-danger/20 hover:bg-danger/10 transition-all"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          {/* Expanded Project Docs */}
          {expandedProject && (
            <div className="bg-base-card rounded-xl border border-accent/20 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">
                  Project Documentation — {projects.find((p) => String(p._id) === expandedProject)?.name}
                </h2>
                <button onClick={() => { setExpandedProject(null); setProjectDocs(null); }} className="text-xs text-slate-400 hover:text-white">Close</button>
              </div>
              {loadingDocs ? (
                <div className="text-accent font-mono animate-pulse text-center p-4">Reading CLAUDE.md & HANDOFF.md from GitHub...</div>
              ) : projectDocs ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-accent mb-2">CLAUDE.md</h3>
                    <pre className="bg-base rounded-lg p-3 text-xs text-slate-300 font-mono overflow-auto max-h-96 whitespace-pre-wrap">
                      {projectDocs.claudeMd || "Not found"}
                    </pre>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-success mb-2">HANDOFF.md</h3>
                    <pre className="bg-base rounded-lg p-3 text-xs text-slate-300 font-mono overflow-auto max-h-96 whitespace-pre-wrap">
                      {projectDocs.handoffMd || "Not found"}
                    </pre>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
