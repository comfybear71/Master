const VERCEL_TOKEN = process.env.VERCEL_TOKEN || "";
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID || "";

const headers: HeadersInit = {
  Authorization: `Bearer ${VERCEL_TOKEN}`,
  "Content-Type": "application/json",
};

function teamParam(): string {
  return VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : "";
}

async function vercelFetch<T>(endpoint: string): Promise<T> {
  const separator = endpoint.includes("?") ? "&" : "?";
  const teamSuffix = VERCEL_TEAM_ID ? `${separator}teamId=${VERCEL_TEAM_ID}` : "";
  const res = await fetch(`https://api.vercel.com${endpoint}${teamSuffix}`, {
    headers,
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    throw new Error(`Vercel API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export interface VercelProject {
  id: string;
  name: string;
  framework: string | null;
  latestDeployments?: VercelDeployment[];
}

export interface VercelDeployment {
  uid: string;
  name: string;
  url: string;
  state: "READY" | "ERROR" | "BUILDING" | "QUEUED" | "CANCELED";
  created: number;
  readyState: string;
  meta?: {
    githubCommitSha?: string;
    githubCommitMessage?: string;
    githubCommitRepo?: string;
  };
}

export interface DeploymentEvent {
  type: string;
  created: number;
  payload?: {
    text?: string;
    statusCode?: number;
    deploymentId?: string;
  };
  text?: string;
}

export async function listProjects(): Promise<VercelProject[]> {
  const data = await vercelFetch<{ projects: VercelProject[] }>("/v9/projects" + teamParam());
  return data.projects;
}

export async function listDeployments(projectId?: string, limit = 10): Promise<VercelDeployment[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (projectId) params.set("projectId", projectId);
  const data = await vercelFetch<{ deployments: VercelDeployment[] }>(
    `/v6/deployments?${params.toString()}`
  );
  return data.deployments;
}

export async function getDeployment(deploymentId: string): Promise<VercelDeployment> {
  return vercelFetch<VercelDeployment>(`/v13/deployments/${deploymentId}`);
}

export async function getDeploymentEvents(deploymentId: string): Promise<DeploymentEvent[]> {
  return vercelFetch<DeploymentEvent[]>(`/v3/deployments/${deploymentId}/events`);
}

export async function getBuildLogs(deploymentId: string): Promise<string> {
  const events = await getDeploymentEvents(deploymentId);
  return events
    .filter((e) => e.text || e.payload?.text)
    .map((e) => e.text || e.payload?.text || "")
    .join("\n");
}

export async function getErrorLogs(deploymentId: string): Promise<string> {
  const logs = await getBuildLogs(deploymentId);
  const lines = logs.split("\n");
  const errorLines: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (
      /error/i.test(line) ||
      /failed/i.test(line) ||
      /ERR!/i.test(line) ||
      /TypeError/i.test(line) ||
      /SyntaxError/i.test(line) ||
      /ModuleNotFoundError/i.test(line) ||
      /Cannot find module/i.test(line) ||
      /Build failed/i.test(line)
    ) {
      const start = Math.max(0, i - 2);
      const end = Math.min(lines.length, i + 5);
      errorLines.push(lines.slice(start, end).join("\n"));
    }
  }
  return errorLines.length > 0 ? errorLines.join("\n---\n") : "";
}

export async function triggerRedeploy(deploymentId: string): Promise<VercelDeployment> {
  const res = await fetch(
    `https://api.vercel.com/v13/deployments${VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ""}`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ deploymentId, target: "production" }),
    }
  );
  if (!res.ok) {
    throw new Error(`Vercel redeploy error: ${res.status}`);
  }
  return res.json() as Promise<VercelDeployment>;
}

export async function getProjectByName(name: string): Promise<VercelProject | null> {
  try {
    return await vercelFetch<VercelProject>(`/v9/projects/${encodeURIComponent(name)}` + teamParam());
  } catch {
    return null;
  }
}
