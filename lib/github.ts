const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const GITHUB_USERNAME = process.env.GITHUB_USERNAME || "";

const headers: HeadersInit = {
  Accept: "application/vnd.github.v3+json",
  ...(GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {}),
};

async function ghFetch<T>(endpoint: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`https://api.github.com${endpoint}`, {
    headers,
    ...init,
    next: init?.method ? undefined : { revalidate: 60 },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API error: ${res.status} ${res.statusText} — ${text}`);
  }
  return res.json() as Promise<T>;
}

export interface GHRepo {
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  updated_at: string;
  open_issues_count: number;
  default_branch: string;
  topics?: string[];
}

export interface GHCommit {
  sha: string;
  commit: {
    message: string;
    author: { name: string; date: string };
  };
  html_url: string;
}

export async function listRepos(): Promise<GHRepo[]> {
  return ghFetch<GHRepo[]>(`/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=30`);
}

export async function getRepo(repo: string): Promise<GHRepo> {
  return ghFetch<GHRepo>(`/repos/${repo}`);
}

export async function getRepoCommits(repo: string, perPage = 5): Promise<GHCommit[]> {
  return ghFetch<GHCommit[]>(`/repos/${repo}/commits?per_page=${perPage}`);
}

export async function getRepoFileContent(repo: string, path: string): Promise<string> {
  interface FileResponse {
    content: string;
    encoding: string;
    sha: string;
  }
  const data = await ghFetch<FileResponse>(`/repos/${repo}/contents/${path}`);
  return Buffer.from(data.content, "base64").toString("utf-8");
}

export async function getRepoFileSha(repo: string, path: string): Promise<string | null> {
  try {
    interface FileResponse {
      sha: string;
    }
    const data = await ghFetch<FileResponse>(`/repos/${repo}/contents/${path}`);
    return data.sha;
  } catch {
    return null;
  }
}

export async function createOrUpdateFile(
  repo: string,
  path: string,
  content: string,
  message: string,
  branch?: string
): Promise<{ sha: string; commitSha: string }> {
  const existingSha = await getRepoFileSha(repo, path);
  const body: Record<string, string> = {
    message,
    content: Buffer.from(content).toString("base64"),
  };
  if (existingSha) body.sha = existingSha;
  if (branch) body.branch = branch;

  const data = await ghFetch<{
    content: { sha: string };
    commit: { sha: string };
  }>(`/repos/${repo}/contents/${path}`, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return { sha: data.content.sha, commitSha: data.commit.sha };
}

export async function getRepoIssues(repo: string, perPage = 10): Promise<Array<{
  number: number;
  title: string;
  state: string;
  html_url: string;
  created_at: string;
}>> {
  return ghFetch(`/repos/${repo}/issues?state=open&per_page=${perPage}`);
}

export async function detectStack(repo: string): Promise<string> {
  const checks = [
    { file: "package.json", detect: detectFromPackageJson },
    { file: "requirements.txt", detect: () => "Python" },
    { file: "Cargo.toml", detect: () => "Rust" },
    { file: "go.mod", detect: () => "Go" },
  ];

  for (const check of checks) {
    try {
      const content = await getRepoFileContent(repo, check.file);
      return check.detect(content);
    } catch {
      // file doesn't exist
    }
  }
  return "Unknown";
}

function detectFromPackageJson(content: string): string {
  try {
    const pkg = JSON.parse(content);
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const parts: string[] = [];

    if (deps["next"]) parts.push("Next.js");
    else if (deps["react"]) parts.push("React");
    else if (deps["vue"]) parts.push("Vue");
    else if (deps["svelte"]) parts.push("Svelte");
    else if (deps["express"]) parts.push("Express");

    if (deps["typescript"]) parts.push("TypeScript");
    if (deps["tailwindcss"]) parts.push("Tailwind");
    if (deps["prisma"] || deps["@prisma/client"]) parts.push("Prisma");
    if (deps["mongoose"] || deps["mongodb"]) parts.push("MongoDB");
    if (deps["@supabase/supabase-js"]) parts.push("Supabase");
    if (deps["stripe"]) parts.push("Stripe");

    return parts.length > 0 ? parts.join(" / ") : "Node.js";
  } catch {
    return "Node.js";
  }
}

export { GITHUB_USERNAME };
