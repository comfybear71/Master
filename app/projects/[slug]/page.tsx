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
  let handoffMd = "No HANDOFF.md found.";
  let claudeMd = "No CLAUDE.md found.";

  try {
    [releases, commits, pkg] = await Promise.all([
      getReleases(project.owner, project.repo),
      getRecentCommits(project.owner, project.repo, 8),
      getPackageJson(project.owner, project.repo)
    ]);

    const handoffRes = await fetch(`https://api.github.com/repos/${project.owner}/${project.repo}/contents/HANDOFF.md`, {
      headers: { 'Accept': 'application/vnd.github.v3+json' },
      next: { revalidate: 3600 }
    });
    if (handoffRes.ok) {
      const data = await handoffRes.json();
      handoffMd = atob(data.content);
    }

    const claudeRes = await fetch(`https://api.github.com/repos/${project.owner}/${project.repo}/contents/CLAUDE.md`, {
      headers: { 'Accept': 'application/vnd.github.v3+json' },
      next: { revalidate: 3600 }
    });
    if (claudeRes.ok) {
      const data = await claudeRes.json();
      claudeMd = atob(data.content);
    }
  } catch (e) {
    console.error(e);
  }

  const dependencies = pkg?.dependencies ? Object.entries(pkg.dependencies) as [string, string][] : [];
  const devDependencies = pkg?.devDependencies ? Object.entries(pkg.devDependencies) as [string, string][] : [];
  const githubUrl = `https://github.com/${project.owner}/${project.repo}`;

  // Clean up tree gibberish and extract useful parts
  const cleanHandoff = handoffMd
    .replace(/âââ/g, '├── ')
    .replace(/âââ/g, '└── ')
    .replace(/â/g, '│ ');

  const overview = cleanHandoff.match(/## Project Overview[\s\S]*?(?=##|$)/i)?.[0] || "No overview found.";
  const architecture = cleanHandoff.match(/## Architecture[\s\S]*?(?=##|$)/i)?.[0] || "No architecture section found.";

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <Link href="/projects" className="text-emerald-400 hover:underline flex items-center gap-1 text-sm mb-6">
        ← Back to Projects
      </Link>

      <h1 className="text-3xl font-bold mb-1">{project.name} Console</h1>
      <p className="text-zinc-500 mb-8">GitHub Intelligence • {project.owner}/{project.repo}</p>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Releases, Dependencies, Commits stay the same - omitted for brevity but keep them from previous version */}

        {/* Improved Rebuild Blueprint */}
        <div className="lg:col-span-3 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">🔧 Rebuild Blueprint</h3>
          
          <div className="mb-6 p-5 bg-zinc-950 rounded-xl">
            <p className="text-emerald-400 font-medium mb-2">Project Overview</p>
            <p className="text-zinc-300 leading-relaxed">
              {overview.replace(/## Project Overview/, '').trim().slice(0, 500)}...
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-emerald-400 font-medium mb-3">Architecture & Repo Structure</p>
              <pre className="bg-zinc-950 p-5 rounded-xl text-xs max-h-80 overflow-auto whitespace-pre-wrap font-mono text-zinc-300">
                {architecture.replace(/## Architecture/, '').trim().slice(0, 1200)}...
              </pre>
            </div>

            <div>
              <p className="text-emerald-400 font-medium mb-3">CLAUDE.md Rules</p>
              <pre className="bg-zinc-950 p-5 rounded-xl text-xs max-h-80 overflow-auto whitespace-pre-wrap font-mono text-zinc-300">
                {claudeMd.slice(0, 800)}...
              </pre>
            </div>
          </div>

          <div className="mt-8 p-5 bg-emerald-900/20 border border-emerald-500/30 rounded-xl text-sm">
            <strong>Next rebuild steps:</strong> Add Environment Variables list, Authentication details, Mobile app integration, and one-click full rebuild guide.
          </div>
        </div>
      </div>
    </div>
  );
}
