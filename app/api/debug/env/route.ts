import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

/**
 * GET /api/debug/env
 * Shows which social media env vars are present at runtime (true/false only, never actual values).
 * Use this to verify Vercel env vars are actually reaching the app.
 */
export async function GET() {
  // Helper: check if env var is set AND non-empty
  const has = (key: string): boolean => {
    const val = process.env[key];
    return val !== undefined && val !== null && val.trim() !== "";
  };

  // Helper: show first few chars for identification without leaking secrets
  const preview = (key: string): string => {
    const val = process.env[key];
    if (!val) return "(not set)";
    if (val.trim() === "") return "(empty string)";
    if (val.length <= 4) return `${val.length} chars`;
    return `${val.slice(0, 4)}...${val.slice(-2)} (${val.length} chars)`;
  };

  // Check if YouTube OAuth token is stored in MongoDB
  let youtubeOAuthStatus = "unknown";
  try {
    const db = await getDb();
    const tokenDoc = await db.collection("oauth_tokens").findOne({ provider: "google_youtube" });
    if (tokenDoc?.refresh_token) {
      youtubeOAuthStatus = `stored (updated: ${tokenDoc.updated_at || "unknown"})`;
    } else {
      youtubeOAuthStatus = "not stored — visit /api/auth/google to authorize";
    }
  } catch {
    youtubeOAuthStatus = "error checking DB";
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,

    // Confirmed Vercel env vars: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, YOUTUBE_CHANNEL_ID
    // OAuth refresh_token stored in MongoDB oauth_tokens collection
    youtube: {
      GOOGLE_CLIENT_ID: has("GOOGLE_CLIENT_ID"),
      GOOGLE_CLIENT_ID_preview: preview("GOOGLE_CLIENT_ID"),
      GOOGLE_CLIENT_SECRET: has("GOOGLE_CLIENT_SECRET"),
      YOUTUBE_CHANNEL_ID: has("YOUTUBE_CHANNEL_ID"),
      YOUTUBE_CHANNEL_ID_preview: preview("YOUTUBE_CHANNEL_ID"),
      oauth_refresh_token: youtubeOAuthStatus,
    },

    // NEEDS USER CONFIRMATION: code expects FACEBOOK_ACCESS_TOKEN + FACEBOOK_PAGE_ID
    facebook: {
      FACEBOOK_ACCESS_TOKEN: has("FACEBOOK_ACCESS_TOKEN"),  // NEEDS USER CONFIRMATION
      FACEBOOK_PAGE_ID: has("FACEBOOK_PAGE_ID"),            // NEEDS USER CONFIRMATION
      FACEBOOK_PAGE_ID_preview: preview("FACEBOOK_PAGE_ID"),
    },

    // NEEDS USER CONFIRMATION: code expects INSTAGRAM_ACCESS_TOKEN + INSTAGRAM_USER_ID
    instagram: {
      INSTAGRAM_ACCESS_TOKEN: has("INSTAGRAM_ACCESS_TOKEN"),  // NEEDS USER CONFIRMATION
      INSTAGRAM_USER_ID: has("INSTAGRAM_USER_ID"),            // NEEDS USER CONFIRMATION
      INSTAGRAM_USER_ID_preview: preview("INSTAGRAM_USER_ID"),
    },

    // Confirmed Vercel env vars: TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET
    tiktok: {
      TIKTOK_CLIENT_KEY: has("TIKTOK_CLIENT_KEY"),
      TIKTOK_CLIENT_SECRET: has("TIKTOK_CLIENT_SECRET"),
    },

    x: {
      X_USERNAME: has("X_USERNAME"),
      X_CONSUMER_KEY: has("X_CONSUMER_KEY"),
      X_CONSUMER_SECRET: has("X_CONSUMER_SECRET"),
      X_ACCESS_TOKEN: has("X_ACCESS_TOKEN"),
      X_ACCESS_TOKEN_SECRET: has("X_ACCESS_TOKEN_SECRET"),
    },

    other: {
      MONGODB_URI: has("MONGODB_URI"),
      ANTHROPIC_API_KEY: has("ANTHROPIC_API_KEY"),
      GITHUB_TOKEN: has("GITHUB_TOKEN"),
      VERCEL_TOKEN: has("VERCEL_TOKEN"),
    },
  });
}
