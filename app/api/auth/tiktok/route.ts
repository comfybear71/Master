import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

/**
 * GET /api/auth/tiktok — Initiates TikTok OAuth 2.0 Authorization Code flow.
 * Redirects the user to TikTok's authorization page.
 */
export async function GET(req: NextRequest) {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  if (!clientKey) {
    return NextResponse.json(
      { error: "TIKTOK_CLIENT_KEY not configured" },
      { status: 500 }
    );
  }

  const baseUrl = process.env.NEXTAUTH_URL || new URL(req.url).origin;
  const redirectUri = `${baseUrl}/api/auth/tiktok/callback`;
  const state = crypto.randomBytes(16).toString("hex");

  // Scopes needed for reading user stats + video list
  const scopes = [
    "user.info.basic",
    "user.info.stats",
    "video.list",
  ].join(",");

  const authUrl = new URL("https://www.tiktok.com/v2/auth/authorize/");
  authUrl.searchParams.set("client_key", clientKey);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);

  // Store state in a cookie for CSRF verification
  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set("tiktok_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  return response;
}
