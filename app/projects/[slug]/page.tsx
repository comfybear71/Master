// app/projects/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { getReleases, getRecentCommits, getPackageJson } from '@/lib/github';

const projectsRegistry = [
  { slug: 'comfy-ai', name: 'Comfy AI', owner: 'comfybear71', repo: 'Comfy-AI' },
  // Add the rest here when you're ready:
  // { slug: 'aig-litch', name: 'AIG!itch', owner: 'comfybear71', repo: 'AIGlitch' },
  // { slug: 'togogo', name: 'Togogo', owner: 'comfybear71', repo: 'Togogo' },
];

export default async function ProjectConsole({ params }: { params: { slug: string } }) {
  const project = projectsRegistry.find(p => p.slug === params.slug);
  if (!project) notFound();

  const [releases, commits, pkg] = await Promise.all([
    getReleases(project.owner, project.repo),
    getRecentCommits(project.owner, project.repo, 8),
    getPackageJson(project.owner, project.repo)
  ]);

  const dependencies = pkg?.dependencies 
    ? Object.entries(pkg.dependencies) as [string, string][] 
    : [];
  
  const devDependencies = pkg?.devDependencies 
    ? Object.entries(pkg.devDependencies) as [string, string][] 
    : [];

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
        {project.name} <span className="text-emerald-400 text-xl">Console</span>
      </h1>
      <p className="text-zinc-500 mb-8">GitHub Intelligence • {project.owner}/{project.repo}</p>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Releases */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">🚀 Latest Releases</h3>
          {releases.length > 0 ? (
            releases.map((rel: any) => (
              <div key={rel.id} className="mb-4 p-4 bg-zinc-950 rounded-lg">
                <div className="flex justify-between items-start">
                  <span className="font-mono text-emerald-400">{rel.tag_name}</span>
                  <a href={rel.html_url} target="_blank" className="text-xs underline text-zinc-400">GitHub →</a>
                </div>
                <p className="text-sm mt-2 line-clamp-3 text-zinc-300">{rel.name || rel.body}</p>
              </div>
            ))
          ) : <p className="text-zinc-500">No releases found.</p>}
        </div>

        {/* Dependencies Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">📦 Dependencies</h3>
          {pkg ? (
            <div className="space-y-6 text-sm">
              {dependencies.length > 0 && (
                <div>
                  <p className="text-emerald-400 text-xs mb-2">PRODUCTION</p>
                  <div className="space-y-1 max-h-60 overflow-auto pr-2">
                    {dependencies.map(([name, version]) => (
                      <div key={name} className="flex justify-between bg-zinc-950 px-3 py-1 rounded">
                        <span className="truncate">{name}</span>
                        <span className="font-mono text-zinc-400">{version}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {devDependencies.length > 0 && (
                <div>
                  <p className="text-amber-400 text-xs mb-2">DEVELOPMENT</p>
                  <div className="space-y-1 max-h-60 overflow-auto pr-2">
                    {devDependencies.map(([name, version]) => (
                      <div key={name} className="flex justify-between bg-zinc-950 px-3 py-1 rounded">
                        <span className="truncate">{name}</span>
                        <span className="font-mono text-zinc-400">{version}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {dependencies.length === 0 && devDependencies.length === 0 && (
                <p className="text-zinc-500">No dependencies found.</p>
              )}
            </div>
          ) : (
            <p className="text-zinc-500">No package.json found on this project.</p>
          )}
        </div>

        {/* Recent Commits */}
        <div className="lg:col-span-3 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">📜 Recent Commits</h3>
          <div className="space-y-3 text-sm max-h-80 overflow-auto">
            {commits.map((c: any) => (
              <div key={c.sha} className="flex gap-3 items-start">
                <div className="font-mono text-xs text-zinc-500 w-16 shrink-0">{c.sha.slice(0,7)}</div>
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
