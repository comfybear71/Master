// app/projects/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { getReleases, getRecentCommits } from '@/lib/github';

const projectsRegistry = [
  { slug: 'comfy-ai',     name: 'Comfy AI',     owner: 'comfybear71', repo: 'Comfy-AI' },
  { slug: 'aig-litch',    name: 'AIG!itch',     owner: 'comfybear71', repo: 'AIGlitch' },
  { slug: 'togogo',       name: 'Togogo',       owner: 'comfybear71', repo: 'Togogo' },
  { slug: 'mathly',       name: 'Mathly',       owner: 'comfybear71', repo: 'Mathly' },
  { slug: 'afl-edge',     name: 'AFL Edge',     owner: 'comfybear71', repo: 'AFL-Edge' },
  { slug: 'budju',        name: 'Budju',        owner: 'comfybear71', repo: 'Budju' },
  // Add any others you have
];

export default async function ProjectConsole({ params }: { params: { slug: string } }) {
  const project = projectsRegistry.find(p => p.slug === params.slug);
  if (!project) notFound();

  const [releases, commits] = await Promise.all([
    getReleases(project.owner, project.repo),
    getRecentCommits(project.owner, project.repo, 8)
  ]);

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
        <p className="text-zinc-500 mb-8">GitHub Intelligence • Live from comfybear71/{project.repo}</p>
      </h1>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Releases */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">🚀 Latest Releases</h3>
          {releases.length > 0 ? releases.map((rel: any) => (
            <div key={rel.id} className="mb-4 p-4 bg-zinc-950 rounded-lg">
              <div className="flex justify-between items-start">
                <span className="font-mono text-emerald-400">{rel.tag_name}</span>
                <a href={rel.html_url} target="_blank" className="text-xs underline">GitHub →</a>
              </div>
              <p className="text-sm mt-2 line-clamp-3 text-zinc-300">{rel.name || rel.body}</p>
            </div>
          )) : <p className="text-zinc-500">No releases found.</p>}
        </div>

        {/* Commits */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">📜 Recent Commits</h3>
          <div className="space-y-3 text-sm max-h-96 overflow-auto">
            {commits.map((c: any) => (
              <div key={c.sha} className="flex gap-3">
                <div className="font-mono text-xs text-zinc-500 w-16">{c.sha.slice(0,7)}</div>
                <div className="flex-1 truncate">{c.commit.message}</div>
                <div className="text-xs text-zinc-500 whitespace-nowrap">
                  {new Date(c.commit.author.date).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
