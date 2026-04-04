import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const headers: HeadersInit = {
  Accept: "application/vnd.github.v3+json",
  ...(GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {}),
};

interface BranchInfo {
  name: string;
  commit: { sha: string };
  protected: boolean;
}

interface CommitInfo {
  sha: string;
  commit: {
    message: string;
    author: { name: string; date: string };
  };
  stats?: { additions: number; deletions: number };
}

async function ghFetch<T>(endpoint: string): Promise<T | null> {
  try {
    const res = await fetch(`https://api.github.com${endpoint}`, { headers });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

async function fileExists(repo: string, path: string): Promise<boolean> {
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, { headers });
  return res.ok;
}

async function checkRepo(repo: string) {
  const issues: string[] = [];
  const warnings: string[] = [];
  const good: string[] = [];

  // Check sacred files
  const hasClaude = await fileExists(repo, "CLAUDE.md");
  const hasHandoff = await fileExists(repo, "HANDOFF.md");
  const hasSafety = await fileExists(repo, "SAFETY-RULES.md");

  if (hasClaude) good.push("CLAUDE.md exists");
  else issues.push("CLAUDE.md is MISSING — project has no brain");

  if (hasHandoff) good.push("HANDOFF.md exists");
  else issues.push("HANDOFF.md is MISSING — project has no memory");

  if (hasSafety) good.push("SAFETY-RULES.md exists");
  else warnings.push("SAFETY-RULES.md is MISSING — no safety guardrails");

  // Check branches
  const branches = await ghFetch<BranchInfo[]>(`/repos/${repo}/branches?per_page=100`);
  const branchNames = branches?.map((b) => b.name) || [];
  const branchCount = branchNames.length;

  // Check for default branch
  const repoInfo = await ghFetch<{ default_branch: string }>(`/repos/${repo}`);
  const defaultBranch = repoInfo?.default_branch || "unknown";

  if (defaultBranch === "main" || defaultBranch === "master") {
    good.push(`Default branch is '${defaultBranch}'`);
  } else {
    issues.push(`Default branch is '${defaultBranch}' — should be main or master`);
  }

  // Count branch types
  const claudeBranches = branchNames.filter((b) => b.startsWith("claude/"));
  const staleBranches = branchNames.filter((b) => b !== "main" && b !== "master" && b !== "dev" && !b.startsWith("claude/"));

  if (branchCount <= 3) {
    good.push(`Clean branch count: ${branchCount}`);
  } else if (branchCount <= 5) {
    warnings.push(`${branchCount} branches — consider cleaning up`);
  } else {
    warnings.push(`${branchCount} branches — too many, clean up stale ones`);
  }

  if (staleBranches.length > 0) {
    warnings.push(`Stale branches: ${staleBranches.join(", ")}`);
  }

  // Check recent commits for dangerous patterns
  const commits = await ghFetch<CommitInfo[]>(`/repos/${repo}/commits?per_page=10&sha=${defaultBranch}`);
  let blanketRevertDetected = false;

  if (commits) {
    for (const c of commits) {
      const msg = c.commit.message.toLowerCase();
      const firstLine = msg.split("\n")[0];
      // Only flag if the first line (the actual action) starts with revert patterns
      // Don't flag commits that merely mention reverts in their description
      if (
        (firstLine.startsWith("revert") && (firstLine.includes("all") || firstLine.includes("everything"))) ||
        firstLine.includes("blanket revert") ||
        firstLine.startsWith("revert everything")
      ) {
        blanketRevertDetected = true;
        issues.push(`Blanket revert detected: "${c.commit.message.slice(0, 80)}" (${c.sha.slice(0, 7)})`);
      }
    }

    if (!blanketRevertDetected) {
      good.push("No blanket reverts in recent history");
    }
  }

  // Overall health score
  const score = issues.length === 0
    ? warnings.length === 0 ? "healthy" : "warning"
    : "critical";

  return {
    repo,
    score,
    defaultBranch,
    branchCount,
    branches: branchNames,
    claudeBranches,
    staleBranches,
    files: { claude: hasClaude, handoff: hasHandoff, safety: hasSafety },
    issues,
    warnings,
    good,
    checkedAt: new Date().toISOString(),
  };
}

// GET /api/repo-health — checks all registered projects
export async function GET() {
  try {
    const db = await getDb();
    const projects = await db.collection("projects").find({}).toArray();

    const results = await Promise.all(
      projects.map((p) => checkRepo(p.repo as string))
    );

    const summary = {
      total: results.length,
      healthy: results.filter((r) => r.score === "healthy").length,
      warning: results.filter((r) => r.score === "warning").length,
      critical: results.filter((r) => r.score === "critical").length,
    };

    return NextResponse.json({ summary, projects: results });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
