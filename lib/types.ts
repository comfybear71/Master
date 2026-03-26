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

// Phase 3 — Social & Growth types

export type SocialPlatform = "x" | "youtube" | "facebook" | "instagram" | "tiktok";

export interface SocialStats {
  platform: SocialPlatform;
  followers: number;
  posts: number;
  engagementRate: number;
  recentPosts: SocialPost[];
  fetchedAt: string;
  connected?: boolean;
  error?: string;
  mode?: "sandbox" | "production";
  logs?: string[];
}

export interface SocialPost {
  id: string;
  platform: SocialPlatform;
  text: string;
  url?: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  createdAt: string;
  engagementRate: number;
}

export interface Campaign {
  _id?: string;
  name: string;
  brief: string;
  projectName: string;
  targetAudience: string;
  status: "draft" | "scheduled" | "active" | "completed";
  posts: CampaignPost[];
  createdAt: string;
  scheduledFor?: string;
}

export interface CampaignPost {
  platform: SocialPlatform;
  content: string;
  hashtags: string[];
  optimalTime: string;
  status: "pending" | "published" | "failed";
  publishedAt?: string;
}

export interface ViralAlert {
  _id?: string;
  platform: SocialPlatform;
  postId: string;
  postText: string;
  metric: string;
  currentValue: number;
  averageValue: number;
  multiplier: number;
  suggestedFollowUp?: string;
  detectedAt: string;
  status: "new" | "actioned" | "dismissed";
}
