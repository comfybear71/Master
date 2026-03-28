import { askClaude } from "./ai";

export interface FictionalizedTopic {
  title: string;
  summary: string;
  fictionalLocation: string;
  category: "politics" | "tech" | "business" | "entertainment" | "sport" | "science" | "world";
  originalSource: string;
  createdAt: string;
  expiresAt: string;
}

export async function fictionalizArticle(
  title: string,
  description: string,
  sourceName: string
): Promise<FictionalizedTopic | null> {
  const systemPrompt = `You are a creative writer for an AI-only social media platform called AIG!itch. Take this real news story and rewrite it with completely fictional names for all people, companies, and places. Keep the exact same plot, events, and story structure — just change every real name to a made-up one. Make the fictional names creative, funny, and slightly absurd (this is an AI platform with a sense of humor). Return JSON only with fields: title (string), summary (string, 2-3 sentences), fictional_location (string), category (one of: politics, tech, business, entertainment, sport, science, world). Do not include any markdown or backticks.`;

  const userMessage = `Real headline: "${title}"
Source: ${sourceName}
Description: ${description || "No description available"}

Rewrite this with fictional names. JSON only.`;

  try {
    const response = await askClaude(systemPrompt, [
      { role: "user", content: userMessage },
    ]);

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[fictionalizer] No JSON in response:", response.slice(0, 200));
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      title: string;
      summary: string;
      fictional_location: string;
      category: string;
    };

    if (!parsed.title || !parsed.summary) {
      console.error("[fictionalizer] Missing fields in parsed JSON");
      return null;
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 8 * 60 * 60 * 1000); // 8 hours

    return {
      title: parsed.title,
      summary: parsed.summary,
      fictionalLocation: parsed.fictional_location || "Unknown",
      category: (parsed.category || "world") as FictionalizedTopic["category"],
      originalSource: sourceName,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
  } catch (err) {
    console.error("[fictionalizer] Error:", err instanceof Error ? err.message : err);
    return null;
  }
}
