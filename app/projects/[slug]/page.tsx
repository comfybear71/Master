// app/projects/[slug]/page.tsx
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ProjectData {
  releases: any[];
  commits: any[];
  pkg: any;
}

const projectsRegistry = [
  { slug: 'comfy-ai',   name: 'Comfy AI',   owner: 'comfybear71', repo: 'Comfy-AI' },
  { slug: 'aiglitch',   name: 'AIG!itch',   owner: 'comfybear71', repo: 'aiglitch' },
];

export default function ProjectConsole({ params }: { params: { slug: string } }) {
  const project = projectsRegistry.find(p => p.slug === params.slug);
  if (!project) return <div>Project not found</div>;

  const [activeTab, setActiveTab] = useState<'overview' | 'dependencies' | 'releases' | 'blueprint'>('overview');
  const [data, setData] = useState<ProjectData>({ releases: [], commits: [], pkg: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [releasesRes, commitsRes, pkgRes] = await Promise.all([
          fetch(`/api/github/releases?owner=${project.owner}&repo=${project.repo}`),
          fetch(`/api/github/commits?owner=${project.owner}&repo=${project.repo}`),
          fetch(`/api/github/package?owner=${project.owner}&repo=${project.repo}`)
        ]);

        const releases = releasesRes.ok ? await releasesRes.json() : [];
        const commits = commitsRes.ok ? await commitsRes.json() : [];
        const pkg = pkgRes.ok ? await pkgRes.json() : null;

        setData({ releases, commits, pkg });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [project]);

  const githubUrl = `https://github.com/${project.owner}/${project.repo}`;

  const dependencies = data.pkg?.dependencies ? Object.entries(data.pkg.dependencies) : [];
  const devDependencies = data.pkg?.devDependencies ? Object.entries(data.pkg.devDependencies) : [];

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <Link href="/projects" className="text-emerald-400 hover:underline flex items-center gap-1 text-sm mb-6">
        ← Back to Projects
      </Link>

      <h1 className="text-3xl font-bold mb-1">{project.name} Console</h1>
      <p className="text-zinc-500 mb-8">GitHub Intelligence • {project.owner}/{project.repo}</p>

      {/* Tabs */}
      <div className="border-b border-zinc-800 mb-8">
        <div className="flex gap-8 text-sm font-medium overflow-x-auto pb-1">
          {['overview', 'dependencies', 'releases', 'blueprint'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`pb-3 px-1 capitalize transition-colors whitespace-nowrap ${
                activeTab === tab 
                  ? 'border-b-2 border-emerald-400 text-emerald-400' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {tab === 'overview' ? 'Overview' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Releases & Commits combined in overview */}
          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4">🚀 Latest Releases</h3>
            {/* your releases UI */}
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4">📦 Dependencies</h3>
            {/* your dependencies UI */}
          </div>
          <div className="lg:col-span-3 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4">📜 Recent Commits</h3>
            {/* your commits UI */}
          </div>
        </div>
      )}

      {activeTab === 'dependencies' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">📦 Dependencies</h3>
          {/* full dependencies UI */}
        </div>
      )}

      {activeTab === 'releases' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">🚀 All Releases</h3>
          {/* releases UI */}
        </div>
      )}

      {activeTab === 'blueprint' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">🔧 Rebuild Blueprint</h3>
          <p className="text-zinc-400">Full rebuild instructions, env vars, and architecture coming in the next update.</p>
        </div>
      )}
    </div>
  );
}
