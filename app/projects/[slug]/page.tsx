import { notFound } from "next/navigation";
import Link from "next/link";
import { getReleases, getRecentCommits, getPackageJson, getFileContent } from "@/lib/github";
import ProjectTabs from "@/components/ProjectTabs";

const PROJECTS = [
  { slug: "Master", owner: "comfybear71", repo: "Master", name: "TheMaster", category: "Infrastructure", icon: "🎯", vercel: "master-six-ashen", liveUrl: "https://masterhq.dev" },
  { slug: "aiglitch", owner: "comfybear71", repo: "aiglitch", name: "AIG!itch", category: "Marketing", icon: "⚡", vercel: "aiglitch", liveUrl: "https://aiglitch.app" },
  { slug: "glitch-app", owner: "comfybear71", repo: "glitch-app", name: "Glitch App", category: "Marketing", icon: "📱", vercel: "glitch-app", liveUrl: "" },
  { slug: "togogo", owner: "comfybear71", repo: "togogo", name: "Togogo", category: "E-commerce", icon: "🛒", vercel: "togogo", liveUrl: "" },
  { slug: "mathly", owner: "comfybear71", repo: "mathly", name: "Mathly", category: "Education", icon: "📐", vercel: "mathly", liveUrl: "" },
  { slug: "AFL-EDGE", owner: "comfybear71", repo: "AFL-EDGE", name: "AFL Edge", category: "Education", icon: "🏈", vercel: "afl-edge", liveUrl: "" },
  { slug: "budju-xyz", owner: "comfybear71", repo: "budju-xyz", name: "Budju", category: "Trading", icon: "💹", vercel: "budju-xyz", liveUrl: "" },
  { slug: "COMFYTV", owner: "comfybear71", repo: "COMFYTV", name: "ComfyTV", category: "Entertainment", icon: "📺", vercel: "COMFYTV", liveUrl: "https://comfytv.xyz" },
];

function extractSection(md: string, heading: string): string | null {
  const regex = new RegExp(`##\\s+${heading}[\\s\\S]*?(?=\\n##\\s|$)`, "i");
  const match = md.match(regex);
  if (!match) return null;
  return match[0].replace(new RegExp(`^##\\s+${heading}\\s*`, "i"), "").trim();
}

function extractTable(md: string, heading: string): string[][] {
  const section = extractSection(md, heading);
  if (!section) return [];
  const lines = section.split("\n").filter((l) => l.includes("|") && !l.match(/^\s*\|[-:\s|]+\|\s*$/));
  return lines.map((l) => l.split("|").map((c) => c.trim()).filter(Boolean));
}

function extractCodeBlock(md: string, heading: string): string | null {
  const section = extractSection(md, heading);
  if (!section) return null;
  const match = section.match(/```[\s\S]*?\n([\s\S]*?)```/);
  return match ? match[1].trim() : null;
}

export default async function ProjectConsole({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = PROJECTS.find((p) => p.slug === slug);
  if (!project) notFound();

  const [releases, commits, pkg, handoffMd, claudeMd] = await Promise.all([
    getReleases(project.owner, project.repo),
    getRecentCommits(project.owner, project.repo, 10),
    getPackageJson(project.owner, project.repo),
    getFileContent(project.owner, project.repo, "HANDOFF.md"),
    getFileContent(project.owner, project.repo, "CLAUDE.md"),
  ]);

  const dependencies = pkg?.dependencies ? (Object.entries(pkg.dependencies) as [string, string][]) : [];
  const devDependencies = pkg?.devDependencies ? (Object.entries(pkg.devDependencies) as [string, string][]) : [];
  const githubUrl = `https://github.com/${project.owner}/${project.repo}`;
  const vercelUrl = `https://vercel.com/stuarts-projects-e0d342be/${project.vercel}`;

  const summary = claudeMd ? (extractSection(claudeMd, "What This Is") || claudeMd.split("\n").slice(0, 5).join("\n")) : null;
  const stack = claudeMd ? extractSection(claudeMd, "Stack|Platform Architecture") : null;
  const folderStructure = claudeMd ? extractCodeBlock(claudeMd, "Folder Structure") : null;
  const envVars = claudeMd ? extractTable(claudeMd, "Environment Variables") : [];
  const integrations = claudeMd ? extractTable(claudeMd, "Key Integrations") : [];
  const authSection = claudeMd ? extractSection(claudeMd, "Authentication.*") : null;
  const nextSteps = handoffMd ? extractSection(handoffMd, "Next Session.*") : null;
  const currentStatus = handoffMd ? extractSection(handoffMd, "Current Status.*") : null;

  const latestRelease = releases?.[0];
  const latestCommit = commits?.[0];
  const language = pkg ? "TypeScript / Next.js" : "Unknown";

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      {/* Breadcrumb + Links */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/projects" className="text-zinc-400 hover:text-white transition-colors">
            Projects
          </Link>
          <span className="text-zinc-600">/</span>
          <span className="text-white font-medium">{project.name}</span>
        </div>
        <div className="flex gap-2">
          <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-xs text-zinc-300 transition-colors">
            GitHub ↗
          </a>
          <a href={vercelUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-xs text-zinc-300 transition-colors">
            Vercel ↗
          </a>
          {project.liveUrl && (
            <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-lg text-xs text-emerald-400 transition-colors">
              Live ↗
            </a>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="text-4xl">{project.icon}</div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">{project.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-400">
              {project.category}
            </span>
            <span className="text-zinc-500 text-sm">{project.owner}/{project.repo}</span>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard label="Releases" value={releases?.length ?? 0} sub={latestRelease?.tag_name || "None"} color="emerald" />
        <StatCard label="Dependencies" value={dependencies.length + devDependencies.length} sub={`${dependencies.length} prod / ${devDependencies.length} dev`} color="blue" />
        <StatCard label="Last Commit" value={latestCommit ? new Date(latestCommit.commit.author.date).toLocaleDateString() : "—"} sub={latestCommit?.commit.message.split("\n")[0].slice(0, 40) || "—"} color="amber" />
        <StatCard label="Stack" value={language} sub={pkg?.dependencies?.next ? `Next.js ${pkg.dependencies.next.replace("^", "")}` : "—"} color="purple" />
      </div>

      {/* Tabs */}
      <ProjectTabs
        tabs={[
          {
            id: "overview",
            label: "Overview",
            icon: "📊",
            content: <OverviewTab releases={releases} commits={commits} githubUrl={githubUrl} />,
          },
          {
            id: "dependencies",
            label: "Dependencies",
            icon: "📦",
            content: <DependenciesTab dependencies={dependencies} devDependencies={devDependencies} />,
          },
          {
            id: "releases",
            label: "Releases",
            icon: "🚀",
            content: <ReleasesTab releases={releases} />,
          },
          {
            id: "blueprint",
            label: "Blueprint",
            icon: "🔧",
            content: (
              <BlueprintTab
                summary={summary}
                stack={stack}
                folderStructure={folderStructure}
                envVars={envVars}
                integrations={integrations}
                authSection={authSection}
                nextSteps={nextSteps}
                currentStatus={currentStatus}
                handoffMd={handoffMd}
                claudeMd={claudeMd}
              />
            ),
          },
        ]}
      />
    </div>
  );
}

/* ============================================================
   Stat Card
   ============================================================ */

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: string }) {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  };
  const classes = colorMap[color] || colorMap.emerald;

  return (
    <div className={`rounded-xl border p-4 ${classes}`}>
      <p className="text-xs uppercase tracking-wider opacity-70 mb-1">{label}</p>
      <p className="text-lg font-bold truncate">{value}</p>
      <p className="text-xs opacity-60 truncate mt-0.5">{sub}</p>
    </div>
  );
}

/* ============================================================
   Overview Tab
   ============================================================ */

function OverviewTab({ releases, commits, githubUrl }: { releases: any[]; commits: any[]; githubUrl: string }) {
  return (
    <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
      {/* Releases */}
      <div className="lg:col-span-2">
        <SectionHeader title="Latest Releases" icon="🚀" />
        <div className="space-y-3">
          {releases?.length > 0 ? (
            releases.slice(0, 5).map((rel: any) => (
              <div key={rel.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-emerald-400 text-sm font-semibold">{rel.tag_name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-500">{new Date(rel.published_at || rel.created_at).toLocaleDateString()}</span>
                    <a href={rel.html_url} target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-400 hover:text-emerald-400 transition-colors">
                      View ↗
                    </a>
                  </div>
                </div>
                {rel.name && <p className="text-sm text-zinc-300 font-medium">{rel.name}</p>}
                {rel.body && (
                  <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{rel.body.slice(0, 200)}</p>
                )}
              </div>
            ))
          ) : (
            <EmptyState message="No releases found" />
          )}
        </div>
      </div>

      {/* Commits */}
      <div>
        <SectionHeader title="Recent Commits" icon="📜" />
        <div className="space-y-1">
          {commits?.length > 0 ? (
            commits.slice(0, 10).map((c: any) => (
              <a
                key={c.sha}
                href={c.html_url || `${githubUrl}/commit/${c.sha}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex gap-3 p-2.5 rounded-lg hover:bg-zinc-800/50 transition-colors group"
              >
                <span className="font-mono text-xs text-zinc-600 w-14 shrink-0 group-hover:text-emerald-400 transition-colors">
                  {c.sha.slice(0, 7)}
                </span>
                <span className="text-sm text-zinc-300 truncate flex-1">
                  {c.commit.message.split("\n")[0]}
                </span>
                <span className="text-xs text-zinc-600 whitespace-nowrap">
                  {new Date(c.commit.author.date).toLocaleDateString()}
                </span>
              </a>
            ))
          ) : (
            <EmptyState message="No commits found" />
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Dependencies Tab
   ============================================================ */

function DependenciesTab({ dependencies, devDependencies }: { dependencies: [string, string][]; devDependencies: [string, string][] }) {
  if (dependencies.length === 0 && devDependencies.length === 0) {
    return <EmptyState message="No package.json found in this repo" />;
  }

  return (
    <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
      <DepList title="Production" deps={dependencies} color="emerald" />
      <DepList title="Development" deps={devDependencies} color="amber" />
    </div>
  );
}

function DepList({ title, deps, color }: { title: string; deps: [string, string][]; color: string }) {
  if (deps.length === 0) return null;
  const colorClass = color === "emerald" ? "text-emerald-400" : "text-amber-400";

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-sm font-semibold uppercase tracking-wider ${colorClass}`}>{title}</h3>
        <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">{deps.length}</span>
      </div>
      <div className="space-y-1 max-h-[500px] overflow-auto">
        {deps.map(([name, version]) => (
          <div key={name} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-zinc-800/50 transition-colors">
            <span className="text-sm text-zinc-300">{name}</span>
            <span className="font-mono text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">{version}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   Releases Tab
   ============================================================ */

function ReleasesTab({ releases }: { releases: any[] }) {
  if (!releases?.length) return <EmptyState message="No releases found" />;

  return (
    <div className="space-y-4">
      {releases.map((rel: any) => (
        <div key={rel.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-3">
              <span className="font-mono text-emerald-400 font-semibold">{rel.tag_name}</span>
              {rel.prerelease && (
                <span className="text-xs bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded">
                  Pre-release
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-500">
                {new Date(rel.published_at || rel.created_at).toLocaleDateString("en-AU", { year: "numeric", month: "short", day: "numeric" })}
              </span>
              <a href={rel.html_url} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-400 hover:underline">
                GitHub ↗
              </a>
            </div>
          </div>
          {rel.name && rel.name !== rel.tag_name && (
            <p className="text-sm text-white font-medium mb-2">{rel.name}</p>
          )}
          {rel.body && (
            <pre className="text-xs text-zinc-400 bg-zinc-950 rounded-lg p-4 max-h-60 overflow-auto whitespace-pre-wrap font-mono">
              {rel.body}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   Blueprint Tab
   ============================================================ */

function BlueprintTab({
  summary, stack, folderStructure, envVars, integrations,
  authSection, nextSteps, currentStatus, handoffMd, claudeMd,
}: {
  summary: string | null; stack: string | null; folderStructure: string | null;
  envVars: string[][]; integrations: string[][]; authSection: string | null;
  nextSteps: string | null; currentStatus: string | null;
  handoffMd: string | null; claudeMd: string | null;
}) {
  return (
    <div className="space-y-6">
      {/* Status Banner */}
      {currentStatus && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-emerald-400 mb-2 font-semibold">Current Status</p>
          <pre className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{currentStatus.slice(0, 500)}</pre>
        </div>
      )}

      {/* Summary */}
      {summary && (
        <BlueprintCard title="Project Summary" icon="📋">
          <pre className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{summary}</pre>
        </BlueprintCard>
      )}

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Stack */}
        {stack && (
          <BlueprintCard title="Stack & Architecture" icon="🏗️">
            <pre className="text-xs text-zinc-400 whitespace-pre-wrap font-mono leading-relaxed max-h-80 overflow-auto">{stack}</pre>
          </BlueprintCard>
        )}

        {/* Folder Structure */}
        {folderStructure && (
          <BlueprintCard title="Folder Structure" icon="📁">
            <pre className="text-xs text-emerald-300/80 whitespace-pre font-mono leading-relaxed max-h-80 overflow-auto">{folderStructure}</pre>
          </BlueprintCard>
        )}
      </div>

      {/* Integrations */}
      {integrations.length > 0 && (
        <BlueprintCard title="Key Integrations" icon="🔌">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700">
                  {integrations[0]?.map((cell, i) => (
                    <th key={i} className="text-left p-2 text-xs text-zinc-400 font-semibold uppercase tracking-wider">{cell}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {integrations.slice(1).map((row, ri) => (
                  <tr key={ri} className="border-b border-zinc-800/50 last:border-0">
                    {row.map((cell, ci) => (
                      <td key={ci} className="p-2 text-zinc-300 text-xs">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </BlueprintCard>
      )}

      {/* Env Vars */}
      {envVars.length > 0 && (
        <BlueprintCard title="Environment Variables" icon="🔑">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700">
                  {envVars[0]?.map((cell, i) => (
                    <th key={i} className="text-left p-2 text-xs text-zinc-400 font-semibold uppercase tracking-wider">{cell}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {envVars.slice(1).map((row, ri) => (
                  <tr key={ri} className="border-b border-zinc-800/50 last:border-0">
                    {row.map((cell, ci) => (
                      <td key={ci} className="p-2 text-zinc-300 text-xs font-mono">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </BlueprintCard>
      )}

      {/* Auth */}
      {authSection && (
        <BlueprintCard title="Authentication" icon="🔐">
          <pre className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-60 overflow-auto">{authSection.slice(0, 1500)}</pre>
        </BlueprintCard>
      )}

      {/* Next Steps */}
      {nextSteps && (
        <BlueprintCard title="Rebuild Checklist / Next Steps" icon="✅">
          <pre className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{nextSteps.slice(0, 2000)}</pre>
        </BlueprintCard>
      )}

      {/* Raw Docs */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {claudeMd && (
          <BlueprintCard title="CLAUDE.md (full)" icon="📄">
            <pre className="text-xs text-zinc-400 whitespace-pre-wrap font-mono leading-relaxed max-h-96 overflow-auto">{claudeMd}</pre>
          </BlueprintCard>
        )}
        {handoffMd && (
          <BlueprintCard title="HANDOFF.md (full)" icon="📋">
            <pre className="text-xs text-zinc-400 whitespace-pre-wrap font-mono leading-relaxed max-h-96 overflow-auto">{handoffMd}</pre>
          </BlueprintCard>
        )}
      </div>

      {!claudeMd && !handoffMd && (
        <EmptyState message="No CLAUDE.md or HANDOFF.md found in this repo. Add them to unlock the full blueprint view." />
      )}
    </div>
  );
}

/* ============================================================
   Shared Components
   ============================================================ */

function BlueprintCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
        <span>{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}

function SectionHeader({ title, icon }: { title: string; icon: string }) {
  return (
    <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
      <span>{icon}</span>
      {title}
    </h3>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 border-dashed rounded-xl p-8 text-center">
      <p className="text-zinc-500 text-sm">{message}</p>
    </div>
  );
}
