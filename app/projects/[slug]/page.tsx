// app/projects/[slug]/page.tsx
import { notFound } from 'next/navigation';

const projectsRegistry = [
  { slug: 'comfy-ai', name: 'Comfy AI', repo: 'comfybear71/Comfy-AI' },
  // Add your other projects here (example):
  // { slug: 'aig-litch', name: 'AIG!itch', repo: 'comfybear71/AIGlitch' },
  // { slug: 'togogo', name: 'Togogo', repo: 'comfybear71/Togogo' },
  // ... etc
];

export default async function ProjectConsole({ params }: { params: { slug: string } }) {
  const project = projectsRegistry.find(p => p.slug === params.slug);
  
  if (!project) notFound();

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
        {project.name} <span className="text-emerald-400 text-xl">Console</span>
      </h1>
      
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
        <p className="text-zinc-400">This is the new dedicated console for <strong>{project.name}</strong>.</p>
        <p className="text-sm text-emerald-400 mt-4">Old projects list still works perfectly.</p>
      </div>

      {/* We'll add Releases & Commits here in the next step */}
      <div className="mt-8 text-sm text-zinc-500">
        Next: Add GitHub Releases + Recent Commits
      </div>
    </div>
  );
}
