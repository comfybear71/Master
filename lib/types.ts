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
