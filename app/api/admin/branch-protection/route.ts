import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// Full list of production repos under comfybear71 that must have branch protection
// (per docs/code-preservation-protocol.md). budju-xyz is the trading bot — handle with care.
const PROTOCOL_REPOS = [
  "Master",
  "aiglitch",
  "budju-xyz",
  "mathly",
  "togogo",
  "propfolio",
  "glitch-app",
] as const;

const OWNER = "comfybear71";

// Settings we apply to master/main on every production repo.
// Matches the Layer 1 checklist in docs/code-preservation-protocol.md.
const PROTECTION_SETTINGS = {
  required_status_checks: null,
  enforce_admins: true,
  required_pull_request_reviews: {
    dismiss_stale_reviews: false,
    require_code_owner_reviews: false,
    required_approving_review_count: 0,
  },
  restrictions: null,
  required_linear_history: true,
  allow_force_pushes: false,
  allow_deletions: false,
  block_creations: false,
  required_conversation_resolution: false,
  lock_branch: false,
  allow_fork_syncing: false,
};

function auth(req: NextRequest): { ok: boolean; error?: NextResponse } {
  const correct = process.env.TERMINAL_PASSWORD;
  if (!correct) {
    return {
      ok: false,
      error: NextResponse.json({ error: "TERMINAL_PASSWORD not set on server" }, { status: 500 }),
    };
  }
  const { searchParams } = new URL(req.url);
  const password = searchParams.get("password") || req.headers.get("x-terminal-password");
  if (password !== correct) {
    return { ok: false, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { ok: true };
}

async function githubFetch(path: string, init?: RequestInit) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN not configured in env");
  return fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
}

async function detectDefaultBranch(repo: string): Promise<string> {
  const res = await githubFetch(`/repos/${OWNER}/${repo}`);
  if (!res.ok) throw new Error(`Failed to fetch repo info: ${res.status}`);
  const data = await res.json();
  return data.default_branch || "master";
}

async function applyProtection(repo: string, branch: string) {
  const res = await githubFetch(
    `/repos/${OWNER}/${repo}/branches/${encodeURIComponent(branch)}/protection`,
    {
      method: "PUT",
      body: JSON.stringify(PROTECTION_SETTINGS),
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status}: ${body}`);
  }
  return res.json();
}

async function getProtectionStatus(repo: string, branch: string) {
  const res = await githubFetch(
    `/repos/${OWNER}/${repo}/branches/${encodeURIComponent(branch)}/protection`
  );
  if (res.status === 404) return { protected: false };
  if (!res.ok) {
    const body = await res.text();
    return { protected: false, error: `${res.status}: ${body.slice(0, 200)}` };
  }
  const data = await res.json();
  return {
    protected: true,
    enforce_admins: data.enforce_admins?.enabled ?? false,
    required_linear_history: data.required_linear_history?.enabled ?? false,
    allow_force_pushes: data.allow_force_pushes?.enabled ?? true,
    allow_deletions: data.allow_deletions?.enabled ?? true,
    required_pull_request_reviews: !!data.required_pull_request_reviews,
  };
}

// GET — list protocol repos and their current protection status
// Usage: curl "https://masterhq.dev/api/admin/branch-protection?password=XXX"
export async function GET(req: NextRequest) {
  const a = auth(req);
  if (!a.ok) return a.error!;

  const results = await Promise.all(
    PROTOCOL_REPOS.map(async (repo) => {
      try {
        const branch = await detectDefaultBranch(repo);
        const status = await getProtectionStatus(repo, branch);
        return { repo, branch, ...status };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { repo, error: msg };
      }
    })
  );

  return NextResponse.json({
    owner: OWNER,
    settings: PROTECTION_SETTINGS,
    repos: results,
  });
}

// POST — apply branch protection to one or more repos
// Body: { repos?: string[], skipTrading?: boolean }
// If repos is omitted, applies to all PROTOCOL_REPOS.
// If skipTrading is true, excludes budju-xyz (trading bot — extra caution).
export async function POST(req: NextRequest) {
  const a = auth(req);
  if (!a.ok) return a.error!;

  let body: { repos?: string[]; skipTrading?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine — means apply to all
  }

  let targetRepos: readonly string[] = body.repos && body.repos.length > 0 ? body.repos : PROTOCOL_REPOS;
  if (body.skipTrading) {
    targetRepos = targetRepos.filter((r) => r !== "budju-xyz");
  }

  const results = await Promise.all(
    targetRepos.map(async (repo) => {
      try {
        const branch = await detectDefaultBranch(repo);
        await applyProtection(repo, branch);
        return { repo, branch, success: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { repo, success: false, error: msg };
      }
    })
  );

  const successCount = results.filter((r) => r.success).length;
  return NextResponse.json({
    summary: `${successCount}/${results.length} repos protected`,
    results,
  });
}
