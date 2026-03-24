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
