import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/tiktok/debug — Shows TikTok OAuth status and tests the token.
 * Does NOT expose the full token — only first 10 chars + test results.
 */
export async function GET() {
  const db = await getDb();
  const oauth = await db.collection("settings").findOne({ key: "tiktok_oauth" });

  if (!oauth) {
    return NextResponse.json({ status: "no_token", message: "No TikTok OAuth token in database" });
  }

  const token = oauth.accessToken as string;
  const debug: Record<string, unknown> = {
    hasToken: !!token,
    tokenPreview: token ? `${token.slice(0, 10)}...` : null,
    openId: oauth.openId || null,
    scope: oauth.scope || null,
    authorizedAt: oauth.authorizedAt || null,
    expiresAt: oauth.expiresAt || null,
    isExpired: oauth.expiresAt ? new Date(oauth.expiresAt) < new Date() : "unknown",
    hasRefreshToken: !!oauth.refreshToken,
  };

  // Test the token against user info (basic fields only)
  if (token) {
    try {
      const res = await fetch(
        "https://open.tiktokapis.com/v2/user/info/?fields=display_name,avatar_url",
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const body = await res.text();
      debug.userInfoTest = {
        status: res.status,
        ok: res.ok,
        body: body.slice(0, 500),
      };
    } catch (err) {
      debug.userInfoTest = {
        error: err instanceof Error ? err.message : String(err),
      };
    }

    // Also test with open_id if we have it
    if (oauth.openId) {
      try {
        const res = await fetch(
          `https://open.tiktokapis.com/v2/user/info/?fields=display_name,avatar_url&open_id=${oauth.openId}`,
          {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const body = await res.text();
        debug.userInfoWithOpenIdTest = {
          status: res.status,
          ok: res.ok,
          body: body.slice(0, 500),
        };
      } catch (err) {
        debug.userInfoWithOpenIdTest = {
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }
  }

  return NextResponse.json(debug);
}
