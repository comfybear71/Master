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

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);

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

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Project Registry</h1>
          <p className="text-sm text-slate-500 mt-1">{projects.length} projects registered</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={seedProjects}
            disabled={adding}
            className="px-4 py-2 bg-success/10 text-success border border-success/20 rounded-lg text-sm hover:bg-success/20 transition-colors font-mono disabled:opacity-50"
          >
            {adding ? "Adding..." : "Seed All Projects"}
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-accent/10 text-accent border border-accent/20 rounded-lg text-sm hover:bg-accent/20 transition-colors font-mono"
          >
            + Add Project
          </button>
        </div>
      </div>

      {/* Add Project Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-base-card rounded-xl border border-accent/20 p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Add New Project</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              placeholder="Project Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="bg-base border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-accent focus:outline-none"
            />
            <input
              placeholder="owner/repo"
              value={formData.repo}
              onChange={(e) => setFormData({ ...formData, repo: e.target.value })}
              required
              className="bg-base border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-accent focus:outline-none"
            />
            <input
              placeholder="Vercel Project ID (optional)"
              value={formData.vercelProjectId}
              onChange={(e) => setFormData({ ...formData, vercelProjectId: e.target.value })}
              className="bg-base border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-accent focus:outline-none"
            />
            <input
              placeholder="Stack (e.g. Next.js / Supabase)"
              value={formData.stack}
              onChange={(e) => setFormData({ ...formData, stack: e.target.value })}
              className="bg-base border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-accent focus:outline-none"
            />
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as Project["category"] })}
              className="bg-base border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-accent focus:outline-none"
            >
              <option value="ecommerce">E-commerce</option>
              <option value="trading">Trading</option>
              <option value="education">Education</option>
              <option value="marketing">Marketing</option>
              <option value="infrastructure">Infrastructure</option>
            </select>
            <input
              placeholder="Live URL (optional)"
              value={formData.liveUrl}
              onChange={(e) => setFormData({ ...formData, liveUrl: e.target.value })}
              className="bg-base border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-accent focus:outline-none"
            />
            <input
              placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-base border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-accent focus:outline-none md:col-span-2"
            />
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
          <p className="text-slate-500 text-sm mb-4">Click &quot;Seed All Projects&quot; to add your 6 registered repos, or add them manually.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <div key={String(p._id)} className="relative group">
              <ProjectCard project={p} />
              <button
                onClick={() => deleteProject(String(p._id))}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-danger text-xs bg-base-card px-2 py-1 rounded border border-danger/20 hover:bg-danger/10 transition-all"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
