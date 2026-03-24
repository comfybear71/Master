import { NextRequest, NextResponse } from "next/server";
import { getAllSocialStats, publishToplatform } from "@/lib/social";
import { getDb } from "@/lib/mongodb";
import { getRepoFileContent } from "@/lib/github";

// ── AIGlitch Social Handles Parser ──────────────────────────────────────
// Reads comfybear71/aiglitch constants.ts and extracts social config

interface SyncedConfig {
  xUsername: string;
  youtubeChannelId: string;
  facebookPageId: string;
  instagramUserId: string;
  tiktokUsername: string;
  syncedFrom: string;
  syncedAt: string;
}

/** Parse AIGlitch's constants.ts to extract social handles */
function parseAIGlitchSocialHandles(fileContent: string): Record<string, string> {
  const handles: Record<string, string> = {};
  const handlesMatch = fileContent.match(/socialHandles:\s*\{([^}]+)\}/);
  if (handlesMatch) {
    const block = handlesMatch[1];
    const regex = /(\w+):\s*["']([^"']+)["']/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(block)) !== null) {
      handles[m[1]] = m[2].replace(/^@/, "");
    }
  }
  return handles;
}

/** Sync social config from a registered project's GitHub repo */
async function syncSocialConfigFromProject(repo: string): Promise<SyncedConfig> {
  // Read the constants file from the project's GitHub repo
  const constantsContent = await getRepoFileContent(repo, "src/lib/bible/constants.ts");
  const handles = parseAIGlitchSocialHandles(constantsContent);

  return {
    xUsername: handles.x || "",
    tiktokUsername: handles.tiktok || "",
    instagramUserId: handles.instagram || "",
    facebookPageId: handles.facebook || "",
    youtubeChannelId: handles.youtube || "",
    syncedFrom: repo,
    syncedAt: new Date().toISOString(),
  };
}

/**
 * Get social config — TheMaster self-configures from multiple sources:
 * 1. DB (previously saved config)
 * 2. Auto-sync from registered project repos (AIGlitch constants.ts)
 * 3. Environment variables as ultimate fallback
 *
 * TheMaster has full access to all repos and all env vars on Vercel.
 * It should NEVER show "not configured" for accounts that exist.
 */
async function getOrSyncConfig(): Promise<Record<string, string>> {
  const db = await getDb();
  const config = await db.collection("settings").findOne({ key: "social_config" });

  // Start with DB values
  const merged: Record<string, string> = {
    xUsername: config?.xUsername || "",
    youtubeChannelId: config?.youtubeChannelId || "",
    facebookPageId: config?.facebookPageId || "",
    instagramUserId: config?.instagramUserId || "",
    tiktokUsername: config?.tiktokUsername || "",
  };

  // If we have all the main ones, return immediately
  if (merged.xUsername && merged.youtubeChannelId && merged.facebookPageId) {
    return merged;
  }

  // Auto-sync from AIGlitch repo if any fields are missing
  if (!merged.xUsername || !merged.youtubeChannelId || !merged.facebookPageId || !merged.tiktokUsername) {
    try {
      const synced = await syncSocialConfigFromProject("comfybear71/aiglitch");
      if (synced.xUsername && !merged.xUsername) merged.xUsername = synced.xUsername;
      if (synced.youtubeChannelId && !merged.youtubeChannelId) merged.youtubeChannelId = synced.youtubeChannelId;
      if (synced.facebookPageId && !merged.facebookPageId) merged.facebookPageId = synced.facebookPageId;
      if (synced.instagramUserId && !merged.instagramUserId) merged.instagramUserId = synced.instagramUserId;
      if (synced.tiktokUsername && !merged.tiktokUsername) merged.tiktokUsername = synced.tiktokUsername;
    } catch {
      // GitHub read failed — continue with env var fallbacks
    }
  }

  // Environment variable fallbacks — TheMaster has these configured in Vercel
  if (!merged.xUsername) merged.xUsername = process.env.X_USERNAME || "";
  if (!merged.youtubeChannelId) merged.youtubeChannelId = process.env.YOUTUBE_CHANNEL_ID || "";
  if (!merged.facebookPageId) merged.facebookPageId = process.env.FACEBOOK_PAGE_ID || "";
  if (!merged.instagramUserId) merged.instagramUserId = process.env.INSTAGRAM_USER_ID || "";
  if (!merged.tiktokUsername) merged.tiktokUsername = process.env.TIKTOK_USERNAME || "";

  // Persist the merged config so we don't re-sync every request
  if (merged.xUsername || merged.youtubeChannelId || merged.facebookPageId) {
    await db.collection("settings").updateOne(
      { key: "social_config" },
      { $set: { key: "social_config", ...merged, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );
  }

  return merged;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  try {
    switch (action) {
      case "stats": {
        const config = await getOrSyncConfig();
        const stats = await getAllSocialStats({
          xUsername: config.xUsername || searchParams.get("xUsername") || undefined,
          youtubeChannelId: config.youtubeChannelId || searchParams.get("youtubeChannelId") || undefined,
          facebookPageId: config.facebookPageId || searchParams.get("facebookPageId") || undefined,
          instagramUserId: config.instagramUserId || searchParams.get("instagramUserId") || undefined,
          tiktokUsername: config.tiktokUsername || searchParams.get("tiktokUsername") || undefined,
        });

        // Cache stats in MongoDB
        const db = await getDb();
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
        const config = await getOrSyncConfig();
        return NextResponse.json(config);
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

    if (action === "sync") {
      // Force re-sync from a project's GitHub repo
      const { repo } = await req.json();
      const targetRepo = repo || "comfybear71/aiglitch";
      const synced = await syncSocialConfigFromProject(targetRepo);

      // Merge with existing config (don't overwrite manually-set IDs with empty strings)
      const db = await getDb();
      const existing = await db.collection("settings").findOne({ key: "social_config" });
      const merged = {
        key: "social_config",
        xUsername: synced.xUsername || existing?.xUsername || "",
        youtubeChannelId: synced.youtubeChannelId || existing?.youtubeChannelId || "",
        facebookPageId: synced.facebookPageId || existing?.facebookPageId || "",
        instagramUserId: synced.instagramUserId || existing?.instagramUserId || "",
        tiktokUsername: synced.tiktokUsername || existing?.tiktokUsername || "",
        syncedFrom: synced.syncedFrom,
        syncedAt: synced.syncedAt,
        updatedAt: new Date().toISOString(),
      };

      await db.collection("settings").updateOne(
        { key: "social_config" },
        { $set: merged },
        { upsert: true }
      );

      return NextResponse.json({ success: true, config: merged });
    }

    if (action === "post") {
      const { platform, content } = await req.json();
      const config = await getOrSyncConfig();
      const result = await publishToplatform(platform, content, {
        facebookPageId: config.facebookPageId,
        facebookAccessToken: process.env.FACEBOOK_ACCESS_TOKEN,
      });
      return NextResponse.json(result);
    }

    if (action === "snapshot") {
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
