"use client";

import { useState } from 'react';
import Link from 'next/link';

interface Props {
  project: any;
  releases: any[];
  commits: any[];
  pkg: any;
}

export default function ClientTabs({ project, releases, commits, pkg }: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'dependencies' | 'releases' | 'blueprint'>('overview');

  const dependencies = pkg?.dependencies ? Object.entries(pkg.dependencies) : [];
  const devDependencies = pkg?.devDependencies ? Object.entries(pkg.devDependencies) : [];
  const githubUrl = `https://github.com/${project.owner}/${project.repo}`;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <Link href="/projects" className="text-emerald-400 hover:underline flex items-center gap-1 text-sm mb-6">
        ← Back to Projects
      </Link>

      <h1 className="text-3xl font-bold mb-1">{project.name} Console</h1>
      <p className="text-zinc-500 mb-8">GitHub Intelligence • {project.owner}/{project.repo}</p>

      {/* Tabs */}
      <div className="border-b border-zinc-800 mb-8">
        <div className="flex gap-8 text-sm font-medium overflow-x-auto">
          {['overview', 'dependencies', 'releases', 'blueprint'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`pb-3 px-1 capitalize transition-colors whitespace-nowrap ${
                activeTab === tab ? 'border-b-2 border-emerald-400 text-emerald-400' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {tab === 'overview' ? 'Overview' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4">🚀 Latest Releases</h3>
            {releases.length > 0 ? releases.map((rel: any) => (
              <div key={rel.id} className="mb-4 p-4 bg-zinc-950 rounded-lg">
                <div className="flex justify-between">
                  <span className="font-mono text-emerald-400">{rel.tag_name}</span>
                  <a href={rel.html_url} target="_blank" className="text-xs underline">GitHub →</a>
                </div>
                <p className="text-sm mt-2 text-zinc-300">{rel.name || rel.body}</p>
              </div>
            )) : <p className="text-zinc-500">No releases found.</p>}
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4">📦 Dependencies</h3>
            {pkg ? (
              <div className="space-y-6 text-sm">
                {dependencies.length > 0 && (
                  <div>
                    <p className="text-emerald-400 text-xs mb-2">PRODUCTION</p>
                    <div className="space-y-1 max-h-60 overflow-auto">
                      {dependencies.map(([name, version]: [string, string]) => (
                        <div key={name} className="flex justify-between bg-zinc-950 px-3 py-1 rounded">
                          <span>{name}</span>
                          <span className="font-mono text-zinc-400">{version}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {devDependencies.length > 0 && (
                  <div>
                    <p className="text-amber-400 text-xs mb-2">DEVELOPMENT</p>
                    <div className="space-y-1 max-h-60 overflow-auto">
                      {devDependencies.map(([name, version]: [string, string]) => (
                        <div key={name} className="flex justify-between bg-zinc-950 px-3 py-1 rounded">
                          <span>{name}</span>
                          <span className="font-mono text-zinc-400">{version}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : <p className="text-zinc-500">No package.json found.</p>}
          </div>

          <div className="lg:col-span-3 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4">📜 Recent Commits</h3>
            <div className="space-y-3 text-sm max-h-96 overflow-auto">
              {commits.map((c: any) => (
                <div key={c.sha} className="flex gap-3">
                  <div className="font-mono text-xs text-zinc-500 w-16">{c.sha.slice(0,7)}</div>
                  <div className="flex-1">{c.commit.message}</div>
                  <div className="text-xs text-zinc-500 whitespace-nowrap">
                    {new Date(c.commit.author.date).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'dependencies' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">📦 Dependencies</h3>
          {/* same dependencies UI as above */}
        </div>
      )}

      {activeTab === 'releases' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">🚀 Releases</h3>
          {/* releases UI */}
        </div>
      )}

      {activeTab === 'blueprint' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">🔧 Rebuild Blueprint</h3>
          <p className="text-zinc-400">This section will show full architecture, env vars, auth, and rebuild steps soon.</p>
        </div>
      )}
    </div>
  );
}
