const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const GITHUB_USERNAME = process.env.GITHUB_USERNAME || "";

const headers: HeadersInit = {
  Accept: "application/vnd.github.v3+json",
  ...(GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {}),
};

async function ghFetch<T>(endpoint: string): Promise<T> {
  const res = await fetch(`https://api.github.com${endpoint}`, {
    headers,
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
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

export async function getRepoCommits(repo: string, perPage = 5): Promise<GHCommit[]> {
  return ghFetch<GHCommit[]>(`/repos/${repo}/commits?per_page=${perPage}`);
}

export async function getRepoFileContent(repo: string, path: string): Promise<string> {
  interface FileResponse {
    content: string;
    encoding: string;
  }
  const data = await ghFetch<FileResponse>(`/repos/${repo}/contents/${path}`);
  return Buffer.from(data.content, "base64").toString("utf-8");
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

export { GITHUB_USERNAME };
