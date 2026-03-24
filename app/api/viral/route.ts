import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { generateViralFollowUp } from "@/lib/ai";
import { SocialPost, ViralAlert, SocialPlatform } from "@/lib/types";
import { ObjectId } from "mongodb";

const VIRAL_MULTIPLIER_THRESHOLD = 2.5; // 2.5x above average = viral

export async function GET() {
  try {
    const db = await getDb();
    const alerts = await db
      .collection<ViralAlert>("viral_alerts")
      .find({})
      .sort({ detectedAt: -1 })
      .limit(20)
      .toArray();
    return NextResponse.json(alerts);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch viral alerts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  try {
    if (action === "scan") {
      return await scanForViralPosts();
    }

    if (action === "generate-followup") {
      const { alertId } = await req.json();
      const db = await getDb();
      const alert = await db.collection("viral_alerts").findOne({ _id: new ObjectId(alertId) });
      if (!alert) {
        return NextResponse.json({ error: "Alert not found" }, { status: 404 });
      }

      const engagementData = `${alert.metric}: ${alert.currentValue} (${alert.multiplier.toFixed(1)}x above average of ${alert.averageValue})`;
      const followUp = await generateViralFollowUp(
        alert.platform as SocialPlatform,
        alert.postText,
        engagementData
      );

      await db.collection("viral_alerts").updateOne(
        { _id: new ObjectId(alertId) },
        { $set: { suggestedFollowUp: followUp, status: "actioned" } }
      );

      return NextResponse.json({ followUp });
    }

    if (action === "dismiss") {
      const { alertId } = await req.json();
      const db = await getDb();
      await db.collection("viral_alerts").updateOne(
        { _id: new ObjectId(alertId) },
        { $set: { status: "dismissed" } }
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Viral API error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function scanForViralPosts() {
  const db = await getDb();
  const stats = await db.collection("social_stats").find({}).toArray();
  const newAlerts: ViralAlert[] = [];

  for (const platformStats of stats) {
    const posts: SocialPost[] = platformStats.recentPosts || [];
    if (posts.length < 3) continue;

    // Calculate average engagement
    const avgLikes = posts.reduce((s, p) => s + p.likes, 0) / posts.length;
    const avgViews = posts.reduce((s, p) => s + p.views, 0) / posts.length;
    const avgComments = posts.reduce((s, p) => s + p.comments, 0) / posts.length;

    for (const post of posts) {
      // Check likes
      if (avgLikes > 0 && post.likes / avgLikes >= VIRAL_MULTIPLIER_THRESHOLD) {
        const existing = await db.collection("viral_alerts").findOne({ postId: post.id, metric: "likes" });
        if (!existing) {
          const alert: Omit<ViralAlert, "_id"> = {
            platform: platformStats.platform,
            postId: post.id,
            postText: post.text.slice(0, 500),
            metric: "likes",
            currentValue: post.likes,
            averageValue: Math.round(avgLikes),
            multiplier: post.likes / avgLikes,
            detectedAt: new Date().toISOString(),
            status: "new",
          };
          const result = await db.collection("viral_alerts").insertOne(alert);
          newAlerts.push({ ...alert, _id: String(result.insertedId) });
        }
      }

      // Check views
      if (avgViews > 0 && post.views / avgViews >= VIRAL_MULTIPLIER_THRESHOLD) {
        const existing = await db.collection("viral_alerts").findOne({ postId: post.id, metric: "views" });
        if (!existing) {
          const alert: Omit<ViralAlert, "_id"> = {
            platform: platformStats.platform,
            postId: post.id,
            postText: post.text.slice(0, 500),
            metric: "views",
            currentValue: post.views,
            averageValue: Math.round(avgViews),
            multiplier: post.views / avgViews,
            detectedAt: new Date().toISOString(),
            status: "new",
          };
          const result = await db.collection("viral_alerts").insertOne(alert);
          newAlerts.push({ ...alert, _id: String(result.insertedId) });
        }
      }

      // Check comments
      if (avgComments > 0 && post.comments / avgComments >= VIRAL_MULTIPLIER_THRESHOLD) {
        const existing = await db.collection("viral_alerts").findOne({ postId: post.id, metric: "comments" });
        if (!existing) {
          const alert: Omit<ViralAlert, "_id"> = {
            platform: platformStats.platform,
            postId: post.id,
            postText: post.text.slice(0, 500),
            metric: "comments",
            currentValue: post.comments,
            averageValue: Math.round(avgComments),
            multiplier: post.comments / avgComments,
            detectedAt: new Date().toISOString(),
            status: "new",
          };
          const result = await db.collection("viral_alerts").insertOne(alert);
          newAlerts.push({ ...alert, _id: String(result.insertedId) });
        }
      }
    }
  }

  return NextResponse.json({
    scanned: stats.length,
    newAlerts: newAlerts.length,
    alerts: newAlerts,
  });
}
