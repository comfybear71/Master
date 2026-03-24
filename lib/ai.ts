import { CampaignPost, SocialPlatform } from "./types";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

interface ClaudeResponse {
  content: Array<{ type: string; text: string }>;
}

export async function askClaude(
  systemPrompt: string,
  messages: ClaudeMessage[]
): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not set");
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
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

  const response = await askClaude(systemPrompt, [
    { role: "user", content: userMessage },
  ]);

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

  const response = await askClaude(systemPrompt, [
    { role: "user", content: userMessage },
  ]);

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

  return askClaude(systemPrompt, [{ role: "user", content: userMessage }]);
}
