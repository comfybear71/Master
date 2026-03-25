import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

/**
 * GET /api/auth/tiktok/callback — TikTok OAuth callback.
 * Exchanges the authorization code for an access token and stores it in MongoDB.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const baseUrl = process.env.NEXTAUTH_URL || new URL(req.url).origin;

  if (error) {
    console.error("[TikTok OAuth] Error:", error, errorDescription);
    return NextResponse.redirect(
      `${baseUrl}/growth?tiktok_auth=error&message=${encodeURIComponent(errorDescription || error)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${baseUrl}/growth?tiktok_auth=error&message=${encodeURIComponent("No authorization code received")}`
    );
  }

  // Verify state (CSRF protection)
  const storedState = req.cookies.get("tiktok_oauth_state")?.value;
  if (state && storedState && state !== storedState) {
    console.error("[TikTok OAuth] State mismatch:", { received: state, stored: storedState });
    return NextResponse.redirect(
      `${baseUrl}/growth?tiktok_auth=error&message=${encodeURIComponent("State mismatch — possible CSRF. Try again.")}`
    );
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;

  if (!clientKey || !clientSecret) {
    return NextResponse.redirect(
      `${baseUrl}/growth?tiktok_auth=error&message=${encodeURIComponent("TIKTOK_CLIENT_KEY or TIKTOK_CLIENT_SECRET not set")}`
    );
  }

  const redirectUri = `${baseUrl}/api/auth/tiktok/callback`;

  try {
    // Exchange authorization code for access token
    console.log("[TikTok OAuth] Exchanging code for token...");
    const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    const tokenText = await tokenRes.text();
    console.log("[TikTok OAuth] Token response status:", tokenRes.status);
    console.log("[TikTok OAuth] Token response:", tokenText.slice(0, 500));

    if (!tokenRes.ok) {
      console.error("[TikTok OAuth] Token exchange failed:", tokenRes.status, tokenText);
      return NextResponse.redirect(
        `${baseUrl}/growth?tiktok_auth=error&message=${encodeURIComponent(`Token exchange failed: ${tokenRes.status}`)}`
      );
    }

    const tokenData = JSON.parse(tokenText) as {
      access_token?: string;
      refresh_token?: string;
      open_id?: string;
      expires_in?: number;
      refresh_expires_in?: number;
      scope?: string;
      token_type?: string;
    };

    if (!tokenData.access_token) {
      console.error("[TikTok OAuth] No access_token in response:", tokenText.slice(0, 300));
      return NextResponse.redirect(
        `${baseUrl}/growth?tiktok_auth=error&message=${encodeURIComponent("No access token received from TikTok")}`
      );
    }

    console.log("[TikTok OAuth] Got access token, open_id:", tokenData.open_id);
    console.log("[TikTok OAuth] Scope:", tokenData.scope);
    console.log("[TikTok OAuth] Expires in:", tokenData.expires_in, "seconds");

    // Store tokens in MongoDB
    const db = await getDb();
    await db.collection("settings").updateOne(
      { key: "tiktok_oauth" },
      {
        $set: {
          key: "tiktok_oauth",
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || null,
          openId: tokenData.open_id || null,
          expiresIn: tokenData.expires_in || null,
          refreshExpiresIn: tokenData.refresh_expires_in || null,
          scope: tokenData.scope || null,
          tokenType: tokenData.token_type || "Bearer",
          authorizedAt: new Date().toISOString(),
          expiresAt: tokenData.expires_in
            ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
            : null,
        },
      },
      { upsert: true }
    );

    console.log("[TikTok OAuth] Token stored in MongoDB");

    // Clear the state cookie
    const response = NextResponse.redirect(`${baseUrl}/growth?tiktok_auth=success`);
    response.cookies.delete("tiktok_oauth_state");
    return response;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[TikTok OAuth] Exception:", msg);
    return NextResponse.redirect(
      `${baseUrl}/growth?tiktok_auth=error&message=${encodeURIComponent(msg)}`
    );
  }
}
