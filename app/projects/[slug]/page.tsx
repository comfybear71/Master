// app/projects/[slug]/page.tsx
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getReleases, getRecentCommits, getPackageJson } from '@/lib/github';

const projectsRegistry = [
  { slug: 'comfy-ai',   name: 'Comfy AI',   owner: 'comfybear71', repo: 'Comfy-AI' },
  { slug: 'aiglitch',   name: 'AIG!itch',   owner: 'comfybear71', repo: 'aiglitch' },
];


export default async function ProjectConsole({ params }: { params: { slug: string } }) {
  const project = projectsRegistry.find(p => p.slug === params.slug);
  if (!project) notFound();

  let releases: any[] = [];
  let commits: any[] = [];
  let pkg: any = null;

  try {
    [releases, commits, pkg] = await Promise.all([
      getReleases(project.owner, project.repo),
      getRecentCommits(project.owner, project.repo, 8),
      getPackageJson(project.owner, project.repo)
    ]);
  } catch (e) {
    console.error('Data fetch failed for', project.slug, e);
  }

  const dependencies = pkg?.dependencies 
    ? Object.entries(pkg.dependencies) as [string, string][] 
    : [];
  
  const devDependencies = pkg?.devDependencies 
    ? Object.entries(pkg.devDependencies) as [string, string][] 
    : [];

  const githubUrl = `https://github.com/${project.owner}/${project.repo}`;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <div className="mb-6">
        <Link href="/projects" className="text-emerald-400 hover:underline flex items-center gap-1 text-sm">
          ← Back to Projects
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-2">{project.name} Console</h1>
      <p className="text-zinc-500 mb-8">GitHub Intelligence • {project.owner}/{project.repo}</p>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">🚀 Latest Releases</h3>
          <div className="space-y-4">
            {releases.length > 0 ? releases.map((rel: any) => (
              <div key={rel.id} className="p-4 bg-zinc-950 rounded-lg">
                <div className="flex justify-between">
                  <span className="font-mono text-emerald-400">{rel.tag_name}</span>
                  <a href={rel.html_url} target="_blank" className="text-xs underline">GitHub →</a>
                </div>
                <p className="text-sm mt-2 text-zinc-300">{rel.name || rel.body}</p>
              </div>
            )) : <p className="text-zinc-500">No releases found.</p>}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">📦 Dependencies</h3>
          {pkg ? (
            <div className="space-y-6 text-sm">
              {dependencies.length > 0 && (
                <div>
                  <p className="text-emerald-400 text-xs mb-2">PRODUCTION</p>
                  <div className="space-y-1 max-h-60 overflow-auto">
                    {dependencies.map(([name, version]) => (
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
                    {devDependencies.map(([name, version]) => (
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
    </div>
  );
}
