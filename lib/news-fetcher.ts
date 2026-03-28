import { SocialPlatform } from "./types";

const NEWS_API_KEY = process.env.NEWS_API_KEY || "";

interface RawArticle {
  title: string;
  description: string | null;
  source: { name: string };
  url: string;
  publishedAt: string;
}

interface NewsAPIResponse {
  status: string;
  articles: RawArticle[];
}

export async function fetchTopHeadlines(pageSize = 10): Promise<RawArticle[]> {
  if (!NEWS_API_KEY) {
    console.error("[news-fetcher] NEWS_API_KEY not set");
    return [];
  }

  try {
    const res = await fetch(
      `https://newsapi.org/v2/top-headlines?language=en&pageSize=${pageSize}&apiKey=${NEWS_API_KEY}`
    );

    if (!res.ok) {
      console.error(`[news-fetcher] NewsAPI returned ${res.status}: ${await res.text().catch(() => "")}`);
      return [];
    }

    const data: NewsAPIResponse = await res.json();
    if (data.status !== "ok" || !Array.isArray(data.articles)) {
      console.error("[news-fetcher] Unexpected response:", JSON.stringify(data).slice(0, 300));
      return [];
    }

    console.log(`[news-fetcher] Fetched ${data.articles.length} headlines`);
    return data.articles.filter((a) => a.title && a.title !== "[Removed]");
  } catch (err) {
    console.error("[news-fetcher] Fetch error:", err instanceof Error ? err.message : err);
    return [];
  }
}
