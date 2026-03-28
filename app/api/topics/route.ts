import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { fetchTopHeadlines } from "@/lib/news-fetcher";
import { fictionalizArticle, FictionalizedTopic } from "@/lib/news-fictionalizer";

// CORS headers for cross-domain access from AIGlitch
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/topics — Public endpoint for AIGlitch to fetch fictionalized news topics.
 * Returns only non-expired topics, most recent first, limit 20.
 */
export async function GET() {
  try {
    const db = await getDb();
    const now = new Date().toISOString();

    const topics = await db
      .collection("fictionalized_topics")
      .find({ expiresAt: { $gt: now } })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    return NextResponse.json(
      { topics: topics.map((t) => ({ ...t, _id: String(t._id) })) },
      { headers: corsHeaders }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch topics";
    return NextResponse.json({ error: message, topics: [] }, { status: 500, headers: corsHeaders });
  }
}

/**
 * POST /api/topics?action=generate — Cron handler.
 * Fetches real news, fictionalizes with Claude, stores in DB.
 * Called every 6 hours via Vercel cron.
 */
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  // Verify cron secret for automated calls
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;
  const isManual = action === "generate"; // Manual trigger from admin

  if (!isCron && !isManual) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[topics] Starting news ingestion pipeline...");
    const db = await getDb();

    // Step 1: Fetch real headlines
    const articles = await fetchTopHeadlines(10);
    console.log(`[topics] Got ${articles.length} real headlines`);

    if (articles.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No articles from NewsAPI — skipping this run",
        generated: 0,
      });
    }

    // Step 2: Fictionalize each article
    let generated = 0;
    let failed = 0;

    for (const article of articles) {
      // Skip if we already have a topic from this source+title combo
      const existing = await db.collection("fictionalized_topics").findOne({
        originalSource: article.source.name,
        createdAt: { $gt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString() },
      });

      if (existing) {
        console.log(`[topics] Skipping duplicate from ${article.source.name}`);
        continue;
      }

      const topic = await fictionalizArticle(
        article.title,
        article.description || "",
        article.source.name
      );

      if (topic) {
        await db.collection("fictionalized_topics").insertOne(topic);
        generated++;
        console.log(`[topics] Generated: "${topic.title}" (${topic.category})`);
      } else {
        failed++;
      }
    }

    // Step 3: Clean up expired topics (older than 24 hours)
    const cleanupThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const deleted = await db.collection("fictionalized_topics").deleteMany({
      expiresAt: { $lt: cleanupThreshold },
    });

    console.log(`[topics] Pipeline complete: ${generated} generated, ${failed} failed, ${deleted.deletedCount} expired cleaned up`);

    return NextResponse.json({
      success: true,
      generated,
      failed,
      cleaned: deleted.deletedCount,
      total: articles.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Topic generation error";
    console.error("[topics] Pipeline error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
