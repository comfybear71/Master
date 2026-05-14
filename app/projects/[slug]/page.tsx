// app/projects/[slug]/page.tsx
import { notFound } from 'next/navigation';
import ClientTabs from './ClientTabs';   // we'll create this small file next

const projectsRegistry = [
  { slug: 'comfy-ai',   name: 'Comfy AI',   owner: 'comfybear71', repo: 'Comfy-AI' },
  { slug: 'aiglitch',   name: 'AIG!itch',   owner: 'comfybear71', repo: 'aiglitch' },
];

export default async function ProjectConsole({ params }: { params: { slug: string } }) {
  const project = projectsRegistry.find(p => p.slug === params.slug);
  if (!project) notFound();

  // Fetch data on the server (fast & reliable)
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

  return <ClientTabs project={project} releases={releases} commits={commits} pkg={pkg} />;
}
