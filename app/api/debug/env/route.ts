import { NextResponse } from "next/server";

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

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,

    youtube: {
      YOUTUBE_API_KEY: has("YOUTUBE_API_KEY"),
      YOUTUBE_API_KEY_preview: preview("YOUTUBE_API_KEY"),
      YOUTUBE_ACCESS_TOKEN: has("YOUTUBE_ACCESS_TOKEN"),
      YOUTUBE_CLIENT_ID: has("YOUTUBE_CLIENT_ID"),
      YOUTUBE_CLIENT_SECRET: has("YOUTUBE_CLIENT_SECRET"),
      YOUTUBE_REFRESH_TOKEN: has("YOUTUBE_REFRESH_TOKEN"),
      YOUTUBE_CHANNEL_ID: has("YOUTUBE_CHANNEL_ID"),
      YOUTUBE_CHANNEL_ID_preview: preview("YOUTUBE_CHANNEL_ID"),
    },

    facebook: {
      FACEBOOK_ACCESS_TOKEN: has("FACEBOOK_ACCESS_TOKEN"),
      FACEBOOK_PAGE_ID: has("FACEBOOK_PAGE_ID"),
      FACEBOOK_PAGE_ID_preview: preview("FACEBOOK_PAGE_ID"),
    },

    instagram: {
      INSTAGRAM_ACCESS_TOKEN: has("INSTAGRAM_ACCESS_TOKEN"),
      INSTAGRAM_USER_ID: has("INSTAGRAM_USER_ID"),
      INSTAGRAM_USER_ID_preview: preview("INSTAGRAM_USER_ID"),
    },

    tiktok: {
      TIKTOK_ACCESS_TOKEN: has("TIKTOK_ACCESS_TOKEN"),
      TIKTOK_TOKEN: has("TIKTOK_TOKEN"),
      TIKTOK_CLIENT_KEY: has("TIKTOK_CLIENT_KEY"),
      TIKTOK_CLIENT_SECRET: has("TIKTOK_CLIENT_SECRET"),
      TIKTOK_REFRESH_TOKEN: has("TIKTOK_REFRESH_TOKEN"),
      TIKTOK_USERNAME: has("TIKTOK_USERNAME"),
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
