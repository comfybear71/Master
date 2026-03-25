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
 * Get social config — env vars are the SOLE source of truth.
 * TheMaster has everything in Vercel env vars. Period.
 * DB had stale garbage from old AIGlitch sync — ignore it.
 */
async function getOrSyncConfig(): Promise<Record<string, string>> {
  return {
    xUsername: process.env.X_USERNAME || "",
    youtubeChannelId: process.env.YOUTUBE_CHANNEL_ID || "",
    facebookPageId: process.env.FACEBOOK_PAGE_ID || "",
    instagramUserId: process.env.INSTAGRAM_USER_ID || "",
    tiktokUsername: process.env.TIKTOK_USERNAME || "",
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  try {
    switch (action) {
      case "debug": {
        // Shows what env vars and DB config are available — for troubleshooting
        const config = await getOrSyncConfig();
        return NextResponse.json({
          envVarsSet: {
            X_USERNAME: !!process.env.X_USERNAME,
            YOUTUBE_CHANNEL_ID: !!process.env.YOUTUBE_CHANNEL_ID,
            FACEBOOK_PAGE_ID: !!process.env.FACEBOOK_PAGE_ID,
            INSTAGRAM_USER_ID: !!process.env.INSTAGRAM_USER_ID,
            TIKTOK_USERNAME: !!process.env.TIKTOK_USERNAME,
          },
          resolvedConfig: {
            xUsername: config.xUsername ? `${config.xUsername.slice(0, 3)}...` : "(empty)",
            youtubeChannelId: config.youtubeChannelId ? `${config.youtubeChannelId.slice(0, 5)}...` : "(empty)",
            facebookPageId: config.facebookPageId ? `${config.facebookPageId.slice(0, 5)}...` : "(empty)",
            instagramUserId: config.instagramUserId ? `${config.instagramUserId.slice(0, 3)}...` : "(empty)",
            tiktokUsername: config.tiktokUsername ? `${config.tiktokUsername.slice(0, 3)}...` : "(empty)",
          },
          deployedAt: new Date().toISOString(),
        });
      }
      case "stats": {
        const config = await getOrSyncConfig();
        console.log("[Social API] Fetching stats with config:", {
          xUsername: config.xUsername ? `${config.xUsername.slice(0, 3)}...` : "(empty)",
          youtubeChannelId: config.youtubeChannelId || "(empty)",
          facebookPageId: config.facebookPageId ? `${config.facebookPageId.slice(0, 5)}...` : "(empty)",
          instagramUserId: config.instagramUserId ? `${config.instagramUserId.slice(0, 3)}...` : "(empty)",
          tiktokUsername: config.tiktokUsername ? `${config.tiktokUsername.slice(0, 3)}...` : "(empty)",
        });
        console.log("[Social API] YouTube env vars:", {
          CLIENT_ID: !!process.env.YOUTUBE_CLIENT_ID,
          CLIENT_SECRET: !!process.env.YOUTUBE_CLIENT_SECRET,
          REFRESH_TOKEN: !!process.env.YOUTUBE_REFRESH_TOKEN,
          CHANNEL_ID: process.env.YOUTUBE_CHANNEL_ID || "(not set)",
        });
        console.log("[Social API] Facebook env vars:", {
          ACCESS_TOKEN: !!process.env.FACEBOOK_ACCESS_TOKEN,
          PAGE_ID: !!process.env.FACEBOOK_PAGE_ID,
        });
        console.log("[Social API] Instagram env vars:", {
          ACCESS_TOKEN: !!process.env.INSTAGRAM_ACCESS_TOKEN,
          USER_ID: !!process.env.INSTAGRAM_USER_ID,
        });
        console.log("[Social API] TikTok env vars:", {
          ACCESS_TOKEN: !!process.env.TIKTOK_ACCESS_TOKEN,
          TOKEN: !!process.env.TIKTOK_TOKEN,
          CLIENT_KEY: !!process.env.TIKTOK_CLIENT_KEY,
          CLIENT_SECRET: !!process.env.TIKTOK_CLIENT_SECRET,
          REFRESH_TOKEN: !!process.env.TIKTOK_REFRESH_TOKEN,
          USERNAME: !!process.env.TIKTOK_USERNAME,
        });
        const stats = await getAllSocialStats({
          xUsername: config.xUsername || searchParams.get("xUsername") || undefined,
          youtubeChannelId: config.youtubeChannelId || searchParams.get("youtubeChannelId") || undefined,
          facebookPageId: config.facebookPageId || searchParams.get("facebookPageId") || undefined,
          instagramUserId: config.instagramUserId || searchParams.get("instagramUserId") || undefined,
          tiktokUsername: config.tiktokUsername || searchParams.get("tiktokUsername") || undefined,
        });

        // Only cache successful results — never cache errors
        const db = await getDb();
        for (const stat of stats) {
          if (!stat.error) {
            await db.collection("social_stats").updateOne(
              { platform: stat.platform },
              { $set: stat },
              { upsert: true }
            );
          }
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
      // Config comes from env vars now — but allow UI overrides
      const config = await req.json();
      const db = await getDb();
      await db.collection("settings").updateOne(
        { key: "social_config" },
        { $set: { key: "social_config", ...config, updatedAt: new Date().toISOString() } },
        { upsert: true }
      );
      return NextResponse.json({ success: true });
    }

    if (action === "clear-db") {
      // Nuke ALL stale social data — config, cached stats, and history
      const db = await getDb();
      await db.collection("settings").deleteOne({ key: "social_config" });
      await db.collection("social_stats").deleteMany({});
      await db.collection("social_history").deleteMany({});
      return NextResponse.json({ success: true, message: "All stale social data cleared from DB" });
    }

    if (action === "sync") {
      // Force re-sync from a project's GitHub repo
      const { repo } = await req.json();
      const targetRepo = repo || "comfybear71/aiglitch";
      const synced = await syncSocialConfigFromProject(targetRepo);

      const merged = {
        key: "social_config",
        xUsername: synced.xUsername || "",
        youtubeChannelId: synced.youtubeChannelId || "",
        facebookPageId: synced.facebookPageId || "",
        instagramUserId: synced.instagramUserId || "",
        tiktokUsername: synced.tiktokUsername || "",
        syncedFrom: synced.syncedFrom,
        syncedAt: synced.syncedAt,
        updatedAt: new Date().toISOString(),
      };

      const db2 = await getDb();
      await db2.collection("settings").updateOne(
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
