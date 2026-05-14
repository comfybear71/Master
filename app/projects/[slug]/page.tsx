// app/projects/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { getReleases, getRecentCommits, getPackageJson } from '@/lib/github';

const projectsRegistry = [
  { slug: 'comfy-ai',     name: 'Comfy AI',     owner: 'comfybear71', repo: 'Comfy-AI' },
  { slug: 'aig-litch',    name: 'AIG!itch',     owner: 'comfybear71', repo: 'aiglitch' },
  { slug: 'glitch-app',   name: 'Glitch App',   owner: 'comfybear71', repo: 'glitch-app' },
  { slug: 'togogo',       name: 'Togogo',       owner: 'comfybear71', repo: 'togogo' },
  { slug: 'mathly',       name: 'Mathly',       owner: 'comfybear71', repo: 'mathly' },
  { slug: 'afl-edge',     name: 'AFL Edge',     owner: 'comfybear71', repo: 'AFL-EDGE' },
  { slug: 'budju',        name: 'Budju',        owner: 'comfybear71', repo: 'budju-xyz' },
  // Bonus ones you might want later:
  // { slug: 'comfymart', name: 'Comfymart', owner: 'comfybear71', repo: 'comfymart' },
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
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-3">
        {project.name} <span className="text-emerald-400 text-lg md:text-xl">Console</span>
      </h1>
      <p className="text-zinc-500 mb-6 text-sm md:text-base">
        GitHub Intelligence • {project.owner}/{project.repo}
      </p>

      <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Releases */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 md:p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">🚀 Latest Releases</h3>
          <div className="space-y-4">
            {releases.length > 0 ? (
              releases.map((rel: any) => (
                <div key={rel.id} className="p-4 bg-zinc-950 rounded-lg">
                  <div className="flex justify-between items-start">
                    <span className="font-mono text-emerald-400 text-sm">{rel.tag_name}</span>
                    <a href={rel.html_url} target="_blank" className="text-xs underline text-zinc-400 hover:text-white">GitHub →</a>
                  </div>
                  <p className="text-sm mt-2 text-zinc-300 line-clamp-3">{rel.name || rel.body}</p>
                </div>
              ))
            ) : <p className="text-zinc-500">No releases found.</p>}
          </div>
        </div>

        {/* Dependencies */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 md:p-6 flex flex-col">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">📦 Dependencies</h3>
          {pkg ? (
            <div className="flex-1 space-y-6 text-sm overflow-hidden flex flex-col">
              {dependencies.length > 0 && (
                <div className="flex-1 flex flex-col min-h-0">
                  <p className="text-emerald-400 text-xs mb-2">PRODUCTION ({dependencies.length})</p>
                  <div className="space-y-1 overflow-auto pr-1 flex-1">
                    {dependencies.map(([name, version]) => (
                      <div key={name} className="flex justify-between bg-zinc-950 px-3 py-1.5 rounded text-xs">
                        <span className="truncate pr-2">{name}</span>
                        <span className="font-mono text-zinc-400 shrink-0">{version}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {devDependencies.length > 0 && (
                <div className="flex-1 flex flex-col min-h-0">
                  <p className="text-amber-400 text-xs mb-2">DEVELOPMENT ({devDependencies.length})</p>
                  <div className="space-y-1 overflow-auto pr-1 flex-1">
                    {devDependencies.map(([name, version]) => (
                      <div key={name} className="flex justify-between bg-zinc-950 px-3 py-1.5 rounded text-xs">
                        <span className="truncate pr-2">{name}</span>
                        <span className="font-mono text-zinc-400 shrink-0">{version}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-zinc-500">No package.json found.</p>
          )}
        </div>

        {/* Recent Commits */}
        <div className="lg:col-span-3 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 md:p-6">
          <h3 className="text-lg font-semibold mb-4">📜 Recent Commits</h3>
          <div className="space-y-3 text-sm max-h-[420px] overflow-auto pr-2">
            {commits.map((c: any) => (
              <div key={c.sha} className="flex gap-3 items-start py-1">
                <div className="font-mono text-xs text-zinc-500 w-16 shrink-0">{c.sha.slice(0,7)}</div>
                <div className="flex-1 pr-4">{c.commit.message}</div>
                <div className="text-xs text-zinc-500 whitespace-nowrap shrink-0">
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
