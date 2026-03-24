export interface Project {
  _id?: string;
  name: string;
  repo: string;
  vercelProjectId: string;
  stack: string;
  category: "ecommerce" | "trading" | "education" | "marketing" | "infrastructure";
  description: string;
  status: "active" | "paused" | "broken";
  liveUrl: string;
  priority: number;
  addedAt: string;
  claudeMd?: string;
  handoffMd?: string;
  defaultBranch?: string;
}

export interface DashboardData {
  totalProjects: number;
  activeProjects: number;
  deployments: {
    ready: number;
    error: number;
    building: number;
  };
  recentCommits: Array<{
    repo: string;
    message: string;
    author: string;
    date: string;
    url: string;
  }>;
  projects: Project[];
}

export interface DetectedError {
  _id?: string;
  projectId: string;
  projectName: string;
  repo: string;
  deploymentId: string;
  deploymentUrl: string;
  errorLog: string;
  detectedAt: string;
  status: "new" | "analyzing" | "fix_ready" | "fix_applied" | "dismissed";
  diagnosis?: string;
  suggestedFix?: string;
  fixFilePath?: string;
  fixConfidence?: "high" | "medium" | "low";
  fixAppliedAt?: string;
  commitSha?: string;
}

export interface UptimeCheck {
  _id?: string;
  projectId: string;
  projectName: string;
  url: string;
  status: "up" | "down" | "unknown";
  statusCode: number | null;
  responseTimeMs: number | null;
  checkedAt: string;
}
