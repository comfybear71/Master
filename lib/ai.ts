import { CampaignPost, SocialPlatform } from "./types";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

// ─── Model Tiering ────────────────────────────────────────
// Haiku is the default for all TheMaster API calls (10-20x cheaper than Sonnet).
// Sonnet is available for complex tasks that need higher reasoning.
// All tasks in TheMaster produce structured JSON — Haiku handles this well.
export const CLAUDE_MODELS = {
  haiku: "claude-haiku-4-5-20251001",   // Default — cheapest, fast, great for JSON
  sonnet: "claude-sonnet-4-20250514",    // Complex error analysis, nuanced content
} as const;

export type ClaudeTier = keyof typeof CLAUDE_MODELS;

// Max tokens per task type — avoid wasting tokens on short outputs
const MAX_TOKENS: Record<string, number> = {
  campaign: 1024,
  email: 1024,
  viral: 512,
  error: 2048,
  default: 1024,
};

interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

interface ClaudeResponse {
  content: Array<{ type: string; text: string }>;
}

export async function askClaude(
  systemPrompt: string,
  messages: ClaudeMessage[],
  options?: { tier?: ClaudeTier; task?: string }
): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not set");
  }

  const model = CLAUDE_MODELS[options?.tier || "haiku"];
  const maxTokens = MAX_TOKENS[options?.task || "default"] || MAX_TOKENS.default;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude API error ${res.status}: ${errText}`);
  }

  const data: ClaudeResponse = await res.json();
  return data.content
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("\n");
}

export async function analyzeError(
  errorLog: string,
  projectContext: string,
  filePath?: string
): Promise<{
  diagnosis: string;
  suggestedFix: string;
  filePath: string;
  confidence: "high" | "medium" | "low";
}> {
  const systemPrompt = `You are a senior full-stack developer analyzing build/deployment errors.
You have access to the project's CLAUDE.md context. Your job is to:
1. Diagnose the root cause of the error
2. Suggest a concrete fix with actual code
3. Identify the file that needs to be changed

Respond in JSON format only:
{
  "diagnosis": "Clear explanation of what went wrong",
  "suggestedFix": "The actual code fix (full file content or diff)",
  "filePath": "path/to/file/that/needs/fixing",
  "confidence": "high|medium|low"
}`;

  const userMessage = `## Project Context (CLAUDE.md)
${projectContext}

## Error Log
${errorLog}

${filePath ? `## Suspected File: ${filePath}` : ""}

Analyze this error and provide a fix in JSON format.`;

  const response = await askClaude(
    systemPrompt,
    [{ role: "user", content: userMessage }],
    { tier: "sonnet", task: "error" }
  );

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    return JSON.parse(jsonMatch[0]);
  } catch {
    return {
      diagnosis: response,
      suggestedFix: "Could not parse automated fix — manual review needed.",
      filePath: filePath || "unknown",
      confidence: "low",
    };
  }
}

// ─── Campaign Generator ────────────────────────────────────

export async function generateCampaign(
  brief: string,
  projectName: string,
  targetAudience: string,
  projectContext?: string
): Promise<{
  name: string;
  posts: CampaignPost[];
}> {
  const systemPrompt = `You are a world-class social media marketing strategist. You create viral, engaging campaigns that drive real growth.

You generate content for ALL 5 platforms simultaneously, each optimized for that platform's format:
- X/Twitter: Max 280 chars, punchy, hashtags, engagement hooks
- YouTube: Video title + description, SEO-optimized, thumbnail concept
- Facebook: Longer form, community-focused, shareable
- Instagram: Visual-first caption, 20-30 hashtags, CTA
- TikTok: Short-form video script, trending hooks, hashtags

Respond in JSON format only:
{
  "name": "Campaign Name",
  "posts": [
    {
      "platform": "x|youtube|facebook|instagram|tiktok",
      "content": "The actual post content",
      "hashtags": ["tag1", "tag2"],
      "optimalTime": "HH:MM UTC — Day"
    }
  ]
}

Generate exactly 5 posts — one per platform. Make each post native to its platform.`;

  const userMessage = `## Campaign Brief
${brief}

## Project: ${projectName}
## Target Audience: ${targetAudience}

${projectContext ? `## Project Context\n${projectContext}` : ""}

Generate a complete multi-platform campaign in JSON format.`;

  const response = await askClaude(
    systemPrompt,
    [{ role: "user", content: userMessage }],
    { tier: "haiku", task: "campaign" }
  );

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      name: parsed.name || `${projectName} Campaign`,
      posts: (parsed.posts || []).map((p: { platform: string; content: string; hashtags?: string[]; optimalTime?: string }) => ({
        platform: p.platform as SocialPlatform,
        content: p.content,
        hashtags: p.hashtags || [],
        optimalTime: p.optimalTime || "12:00 UTC",
        status: "pending" as const,
      })),
    };
  } catch {
    return {
      name: `${projectName} Campaign`,
      posts: [],
    };
  }
}

export async function generateViralFollowUp(
  platform: SocialPlatform,
  originalPost: string,
  engagementData: string
): Promise<string> {
  const systemPrompt = `You are a viral content strategist. A post is performing well above average. Generate a follow-up post for the same platform that capitalizes on this momentum.

Keep the same tone and style. Reference or build on the original post. Make it feel like a natural continuation, not forced.

Return just the post content — no JSON, no explanation.`;

  const userMessage = `Platform: ${platform}
Original post: ${originalPost}
Performance data: ${engagementData}

Write a follow-up post to capitalize on this momentum.`;

  return askClaude(
    systemPrompt,
    [{ role: "user", content: userMessage }],
    { tier: "haiku", task: "viral" }
  );
}

export async function generateSponsorEmail(
  companyName: string,
  industry: string,
  productDescription: string,
  tone: "formal" | "casual" | "bold",
  stats: { totalFollowers: number; platforms: Array<{ name: string; followers: number; posts: number }> }
): Promise<{
  subject: string;
  body: string;
  followUpSubject: string;
  followUpBody: string;
}> {
  const platformStats = stats.platforms
    .map((p) => `${p.name}: ${p.followers.toLocaleString()} followers, ${p.posts} posts`)
    .join("\n");

  const systemPrompt = `You are an expert B2B sales copywriter specializing in influencer marketing and sponsored content partnerships.

You write compelling outreach emails for AIG!itch — an AI-only social media platform where 96+ AI personas autonomously create content (videos, posts, memes). Brands can sponsor product placement in AI-generated video ads.

The tone should be ${tone === "formal" ? "professional and corporate" : tone === "casual" ? "friendly and approachable, like one founder to another" : "bold, confident, and attention-grabbing"}.

Our platform stats:
- Total audience: ${stats.totalFollowers.toLocaleString()} followers across all platforms
${platformStats}

Ad formats available:
- 10s AI-generated video ads ($50-$100)
- 30s extended video ads ($250)
- Multi-video campaign packages ($500+)
- All ads auto-distributed to X, TikTok, Instagram, Facebook, YouTube, Telegram

Payment model:
- We use our own proprietary currency called §GLITCH coin
- Sponsors pay via any standard payment method (bank transfer, PayPal, credit card, crypto)
- We convert their payment into §GLITCH coin internally
- §GLITCH is then disbursed amongst the AI personas who create the content
- This is what keeps the AI ecosystem running — the personas "earn" §GLITCH for their creative work
- It's a unique model: sponsors literally fund the AI creators who make their ads

Key selling points:
- AI personas create unique, engaging content that feels organic
- Full creative handled by AI — sponsor just provides product info
- Cross-platform distribution included
- Real engagement metrics provided after campaign
- Unique §GLITCH coin economy means your ad spend directly powers the AI creators
- Simple payment: pay in your preferred currency, we handle the rest

IMPORTANT: Always sign off emails as:
Stuie French - The Architect
Founder, AIG!itch
aiglitch.app
stuart.french@aiglitch.app

Never use [Your Name] or placeholders. Always use "Stuie French - The Architect" as the sender name.

Respond in JSON format:
{
  "subject": "Email subject line",
  "body": "Full email body in plain text (use line breaks for paragraphs)",
  "followUpSubject": "Follow-up email subject (sent 5 days later if no reply)",
  "followUpBody": "Follow-up email body"
}`;

  const userMessage = `Generate a sponsor outreach email for:
- Company: ${companyName}
- Industry: ${industry}
- What they sell: ${productDescription}

Write a personalized pitch explaining why their product would be perfect for AIG!itch's AI-generated ad campaigns.`;

  const response = await askClaude(
    systemPrompt,
    [{ role: "user", content: userMessage }],
    { tier: "haiku", task: "email" }
  );

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    return JSON.parse(jsonMatch[0]);
  } catch {
    return {
      subject: `Partnership opportunity: ${companyName} x AIG!itch`,
      body: `Hi,\n\nI'd love to discuss a sponsored content opportunity between ${companyName} and AIG!itch.\n\nBest regards`,
      followUpSubject: `Following up: ${companyName} x AIG!itch`,
      followUpBody: `Hi,\n\nJust following up on my previous email about a potential partnership.\n\nBest regards`,
    };
  }
}

export async function generateCrossProjectCampaign(
  projects: Array<{ name: string; description: string; url: string }>,
  brief: string,
  targetAudience: string
): Promise<{
  name: string;
  strategy: string;
  posts: CampaignPost[];
}> {
  const projectList = projects
    .map((p) => `- ${p.name}: ${p.description} (${p.url})`)
    .join("\n");

  const systemPrompt = `You are a growth hacker who specializes in cross-promotion between multiple products owned by the same company.

You create campaigns where each project promotes the others, creating a network effect. Each post should feel natural to its platform while subtly driving traffic between projects.

Respond in JSON format:
{
  "name": "Campaign Name",
  "strategy": "2-3 sentence overview of the cross-promotion strategy",
  "posts": [
    {
      "platform": "x|youtube|facebook|instagram|tiktok",
      "content": "Post content",
      "hashtags": ["tag1"],
      "optimalTime": "HH:MM UTC — Day",
      "promotesProject": "Which project this post promotes"
    }
  ]
}

Generate 5-10 posts across different platforms, each promoting a different project from the portfolio.`;

  const userMessage = `## Projects to Cross-Promote
${projectList}

## Campaign Brief
${brief}

## Target Audience
${targetAudience}

Generate a cross-project promotional campaign.`;

  const response = await askClaude(
    systemPrompt,
    [{ role: "user", content: userMessage }],
    { tier: "haiku", task: "campaign" }
  );

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      name: parsed.name || "Cross-Project Campaign",
      strategy: parsed.strategy || "",
      posts: (parsed.posts || []).map((p: { platform: string; content: string; hashtags?: string[]; optimalTime?: string }) => ({
        platform: p.platform as SocialPlatform,
        content: p.content,
        hashtags: p.hashtags || [],
        optimalTime: p.optimalTime || "12:00 UTC",
        status: "pending" as const,
      })),
    };
  } catch {
    return { name: "Cross-Project Campaign", strategy: "", posts: [] };
  }
}
