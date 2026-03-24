import { NextRequest, NextResponse } from "next/server";
import { getAllSocialStats, publishToplatform } from "@/lib/social";
import { getDb } from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  try {
    switch (action) {
      case "stats": {
        const db = await getDb();
        const config = await db.collection("settings").findOne({ key: "social_config" });
        const stats = await getAllSocialStats({
          xUsername: config?.xUsername || searchParams.get("xUsername") || undefined,
          youtubeChannelId: config?.youtubeChannelId || searchParams.get("youtubeChannelId") || undefined,
          facebookPageId: config?.facebookPageId || searchParams.get("facebookPageId") || undefined,
          instagramUserId: config?.instagramUserId || searchParams.get("instagramUserId") || undefined,
        });

        // Cache stats in MongoDB
        for (const stat of stats) {
          await db.collection("social_stats").updateOne(
            { platform: stat.platform },
            { $set: stat },
            { upsert: true }
          );
        }

        return NextResponse.json(stats);
      }
      case "config": {
        const db = await getDb();
        const config = await db.collection("settings").findOne({ key: "social_config" });
        return NextResponse.json(config || {});
      }
      case "cached": {
        const db = await getDb();
        const cached = await db.collection("social_stats").find({}).toArray();
        return NextResponse.json(cached);
      }
      case "history": {
        const db = await getDb();
        const platform = searchParams.get("platform");
        const history = await db.collection("social_history")
          .find(platform ? { platform } : {})
          .sort({ fetchedAt: -1 })
          .limit(90)
          .toArray();
        return NextResponse.json(history);
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Social API error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  try {
    if (action === "configure") {
      const config = await req.json();
      const db = await getDb();
      await db.collection("settings").updateOne(
        { key: "social_config" },
        { $set: { key: "social_config", ...config, updatedAt: new Date().toISOString() } },
        { upsert: true }
      );
      return NextResponse.json({ success: true });
    }

    if (action === "post") {
      const { platform, content } = await req.json();
      const db = await getDb();
      const socialConfig = await db.collection("settings").findOne({ key: "social_config" });
      const result = await publishToplatform(platform, content, {
        facebookPageId: socialConfig?.facebookPageId,
        facebookAccessToken: process.env.FACEBOOK_ACCESS_TOKEN,
      });
      return NextResponse.json(result);
    }

    if (action === "snapshot") {
      // Save current stats to history for growth tracking
      const db = await getDb();
      const current = await db.collection("social_stats").find({}).toArray();
      if (current.length > 0) {
        const snapshot = current.map((s) => ({
          platform: s.platform,
          followers: s.followers,
          posts: s.posts,
          engagementRate: s.engagementRate,
          fetchedAt: new Date().toISOString(),
        }));
        await db.collection("social_history").insertMany(snapshot);
      }
      return NextResponse.json({ success: true, saved: current.length });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Social API error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
