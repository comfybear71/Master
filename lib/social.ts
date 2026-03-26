/**
 * TheMaster Social Media Platform Connectors
 * =============================================
 * Based on AIGlitch (comfybear71/aiglitch) production-proven integrations.
 *
 * Platform status:
 * - X/Twitter: Fully working (OAuth 1.0a, free tier 500-1500 posts/month)
 * - Facebook: Fully working (Graph API v21.0, page posting)
 * - YouTube: Working but sometimes has issues (Data API v3, token refresh)
 * - TikTok: Sandboxed/limited (Content Posting API, needs audit for public)
 * - Instagram: Coming soon (Graph API via Meta, needs Business Account)
 */

import { SocialStats, SocialPost, SocialPlatform } from "./types";
import { buildOAuth1Header, getAppCredentials } from "./oauth1";

// ── Post Result ──────────────────────────────────────────────────────────

interface PostResult {
  success: boolean;
  platformPostId?: string;
  platformUrl?: string;
  error?: string;
}

// ══════════════════════════════════════════════════════════════════════════
//  X / Twitter — OAuth 1.0a (from AIGlitch, fully working)
// ══════════════════════════════════════════════════════════════════════════

export async function postToX(text: string): Promise<PostResult> {
  try {
    const creds = getAppCredentials();
    if (!creds) {
      return { success: false, error: "X OAuth 1.0a credentials not configured (X_CONSUMER_KEY, X_CONSUMER_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET)" };
    }

    const tweetUrl = "https://api.twitter.com/2/tweets";
    const payload: Record<string, unknown> = { text };

    const authHeader = buildOAuth1Header("POST", tweetUrl, creds);

    const response = await fetch(tweetUrl, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errBody = await response.text();
      return { success: false, error: `X API ${response.status}: ${errBody}` };
    }

    const data = await response.json() as { data?: { id?: string } };
    const tweetId = data.data?.id;

    return {
      success: true,
      platformPostId: tweetId,
      platformUrl: tweetId ? `https://x.com/i/status/${tweetId}` : undefined,
    };
  } catch (err) {
    return { success: false, error: `X error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

export async function getXStats(username: string): Promise<SocialStats> {
  try {
    const creds = getAppCredentials();
    if (!creds) throw new Error("X OAuth 1.0a credentials not set (X_CONSUMER_KEY etc.)");

    // Strip @ prefix if present
    const cleanUsername = username.replace(/^@/, "");

    // X free tier is WRITE-ONLY — user lookup and tweet reading require Basic ($100/mo).
    // Try the API call, but gracefully handle 401/403 for free-tier accounts.
    const userUrl = `https://api.twitter.com/2/users/by/username/${cleanUsername}`;
    const userParams = { "user.fields": "public_metrics" };
    const userAuth = buildOAuth1Header("GET", userUrl, creds, userParams);

    const userRes = await fetch(`${userUrl}?user.fields=public_metrics`, {
      headers: { Authorization: userAuth },
    });

    // Free tier returns 401/403 for read endpoints — this is normal
    if (userRes.status === 401 || userRes.status === 403) {
      return {
        platform: "x",
        followers: 0,
        posts: 0,
        engagementRate: 0,
        recentPosts: [],
        fetchedAt: new Date().toISOString(),
        connected: true,
        error: "X free tier is write-only — stats require Basic plan ($100/mo). Posting works fine.",
      };
    }

    if (!userRes.ok) throw new Error(`X API: ${userRes.status} ${await userRes.text()}`);
    const userData: { data: { id: string; public_metrics: { followers_count: number; tweet_count: number } } } = await userRes.json();

    // Fetch recent tweets (also requires Basic tier)
    const tweetsUrl = `https://api.twitter.com/2/users/${userData.data.id}/tweets`;
    const tweetsParams = { max_results: "10", "tweet.fields": "public_metrics,created_at" };
    const tweetsAuth = buildOAuth1Header("GET", tweetsUrl, creds, tweetsParams);

    const tweetsRes = await fetch(`${tweetsUrl}?max_results=10&tweet.fields=public_metrics,created_at`, {
      headers: { Authorization: tweetsAuth },
    });
    const tweetsData: { data?: Array<{
      id: string; text: string; created_at: string;
      public_metrics: { like_count: number; reply_count: number; retweet_count: number; impression_count?: number };
    }> } = tweetsRes.ok ? await tweetsRes.json() : { data: [] };

    const followers = userData.data.public_metrics.followers_count;

    const recentPosts: SocialPost[] = (tweetsData.data || []).map((t) => ({
      id: t.id,
      platform: "x" as SocialPlatform,
      text: t.text,
      url: `https://x.com/${cleanUsername}/status/${t.id}`,
      likes: t.public_metrics.like_count,
      comments: t.public_metrics.reply_count,
      shares: t.public_metrics.retweet_count,
      views: t.public_metrics.impression_count || 0,
      createdAt: t.created_at,
      engagementRate: followers > 0
        ? ((t.public_metrics.like_count + t.public_metrics.reply_count + t.public_metrics.retweet_count) / followers) * 100
        : 0,
    }));

    return {
      platform: "x",
      followers,
      posts: userData.data.public_metrics.tweet_count,
      engagementRate: recentPosts.length > 0
        ? recentPosts.reduce((s, p) => s + p.engagementRate, 0) / recentPosts.length : 0,
      recentPosts,
      connected: true,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      platform: "x", followers: 0, posts: 0, engagementRate: 0, recentPosts: [],
      fetchedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : "X API error",
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════
//  Facebook — Graph API v21.0 (from AIGlitch, fully working)
// ══════════════════════════════════════════════════════════════════════════

export async function postToFacebook(text: string, pageId: string, accessToken: string): Promise<PostResult> {
  try {
    if (!pageId || !accessToken) {
      return { success: false, error: "Facebook page ID or access token not configured" };
    }

    // Text-only post to page feed (same as AIGlitch)
    const endpoint = `https://graph.facebook.com/v21.0/${pageId}/feed`;
    const params = new URLSearchParams({ access_token: accessToken, message: text });

    const response = await fetch(`${endpoint}?${params.toString()}`, { method: "POST" });
    if (!response.ok) {
      const errBody = await response.text();
      return { success: false, error: `FB ${response.status}: ${errBody}` };
    }

    const data = await response.json() as { id?: string; post_id?: string };
    const postId = data.post_id || data.id;

    let platformUrl: string | undefined;
    if (postId && postId.includes("_")) {
      const [pgId, pId] = postId.split("_");
      platformUrl = `https://www.facebook.com/${pgId}/posts/${pId}`;
    } else if (postId) {
      platformUrl = `https://www.facebook.com/${pageId}/posts/${postId}`;
    }

    return { success: true, platformPostId: postId, platformUrl };
  } catch (err) {
    return { success: false, error: `Facebook error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/**
 * Get the Page Access Token for a specific page from a User Access Token.
 * User tokens can't read page stats directly — you need the page-specific token.
 * GET /me/accounts returns all pages the user manages with their page tokens.
 */
async function getPageAccessToken(userToken: string, pageId: string): Promise<string> {
  const res = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?access_token=${userToken}`
  );
  if (!res.ok) {
    // If /me/accounts fails, the token might already BE a page token — return it as-is
    return userToken;
  }
  const data: { data?: Array<{ id: string; access_token: string }> } = await res.json();
  const page = data.data?.find((p) => p.id === pageId);
  // If we found a page-specific token, use it. Otherwise the token might already be a page token.
  return page?.access_token || userToken;
}

export async function getFacebookStats(pageId: string): Promise<SocialStats> {
  try {
    console.log("[Facebook] getFacebookStats called for page:", pageId);
    const userToken = process.env.FACEBOOK_ACCESS_TOKEN;
    console.log("[Facebook] FACEBOOK_ACCESS_TOKEN set:", !!userToken);
    console.log("[Facebook] FACEBOOK_PAGE_ID env:", process.env.FACEBOOK_PAGE_ID || "(not set)");
    if (!userToken) throw new Error("FACEBOOK_ACCESS_TOKEN not set in Vercel — this is required for Facebook Graph API");

    // Exchange user token for page-specific token (required for page stats)
    const accessToken = await getPageAccessToken(userToken, pageId);

    // Page info with fan count — try multiple field combinations
    // Some tokens only have access to certain fields
    let pageData: { fan_count?: number; followers_count?: number; name?: string } = {};
    const pageRes = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}?fields=fan_count,followers_count,name&access_token=${accessToken}`
    );
    if (pageRes.ok) {
      pageData = await pageRes.json();
    } else {
      // Try with just the page token and fewer fields
      const retryRes = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}?fields=name&access_token=${accessToken}`
      );
      if (!retryRes.ok) {
        const errText = await retryRes.text();
        throw new Error(`Facebook API ${retryRes.status}: ${errText.slice(0, 300)}`);
      }
      pageData = await retryRes.json();
    }

    const followers = pageData.fan_count || pageData.followers_count || 0;

    // Recent posts with engagement
    const postsRes = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}/posts?fields=message,created_time,likes.summary(true),comments.summary(true),shares&limit=10&access_token=${accessToken}`
    );
    const postsData: { data?: Array<{
      id: string; message?: string; created_time: string;
      likes?: { summary: { total_count: number } };
      comments?: { summary: { total_count: number } };
      shares?: { count: number };
    }> } = postsRes.ok ? await postsRes.json() : { data: [] };

    const recentPosts: SocialPost[] = (postsData.data || []).map((p) => {
      const likes = p.likes?.summary?.total_count || 0;
      const comments = p.comments?.summary?.total_count || 0;
      const shares = p.shares?.count || 0;
      return {
        id: p.id,
        platform: "facebook" as SocialPlatform,
        text: p.message || "(no text)",
        url: `https://facebook.com/${p.id}`,
        likes, comments, shares, views: 0,
        createdAt: p.created_time,
        engagementRate: followers > 0
          ? ((likes + comments + shares) / followers) * 100 : 0,
      };
    });

    return {
      platform: "facebook",
      followers,
      posts: recentPosts.length,
      engagementRate: recentPosts.length > 0
        ? recentPosts.reduce((s, p) => s + p.engagementRate, 0) / recentPosts.length : 0,
      recentPosts,
      connected: true,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      platform: "facebook", followers: 0, posts: 0, engagementRate: 0, recentPosts: [],
      fetchedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Facebook API error",
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════
//  YouTube — Data API v3 (OAuth via GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET)
//  Confirmed Vercel env vars: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, YOUTUBE_CHANNEL_ID
//  Auth flow: User visits /api/auth/google → Google OAuth consent → callback stores
//  refresh_token in MongoDB oauth_tokens collection (key: "google_youtube").
//  At runtime: read refresh_token from DB, exchange for fresh access_token.
// ══════════════════════════════════════════════════════════════════════════

import { getDb } from "./mongodb";

/**
 * Get YouTube OAuth2 access token by refreshing the stored token.
 * Reads refresh_token from MongoDB `oauth_tokens` (provider: "google_youtube"),
 * then uses GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET to get a fresh access_token.
 */
async function getYouTubeAccessToken(): Promise<string | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  console.log("[YouTube] getYouTubeAccessToken called");
  console.log("[YouTube]   GOOGLE_CLIENT_ID set:", !!clientId, clientId ? `(${clientId.slice(0, 12)}...)` : "");
  console.log("[YouTube]   GOOGLE_CLIENT_SECRET set:", !!clientSecret, clientSecret ? `(${clientSecret.length} chars)` : "");

  if (!clientId || !clientSecret) {
    console.error("[YouTube] Missing credentials:", {
      GOOGLE_CLIENT_ID: !!clientId,
      GOOGLE_CLIENT_SECRET: !!clientSecret,
    });
    return null;
  }

  try {
    // Read refresh_token from MongoDB oauth_tokens collection
    const db = await getDb();
    const tokenDoc = await db.collection("oauth_tokens").findOne({ provider: "google_youtube" });

    if (!tokenDoc?.refresh_token) {
      console.error("[YouTube] No refresh_token found in oauth_tokens for google_youtube.");
      console.error("[YouTube] User needs to visit /api/auth/google to authorize YouTube access.");
      return null;
    }

    console.log("[YouTube] Found stored refresh_token, exchanging for fresh access_token...");

    // Exchange refresh_token for a fresh access_token
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: tokenDoc.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    const responseText = await res.text();
    console.log("[YouTube] Token refresh response status:", res.status);
    console.log("[YouTube] Token refresh response body:", responseText.slice(0, 400));

    if (!res.ok) {
      console.error("[YouTube] Token refresh failed:", res.status, responseText.slice(0, 400));
      return null;
    }

    const data = JSON.parse(responseText) as { access_token?: string; expires_in?: number; token_type?: string };
    if (data.access_token) {
      console.log("[YouTube] Got fresh access token, type:", data.token_type, "expires_in:", data.expires_in);

      // Update the stored access_token and expiry
      await db.collection("oauth_tokens").updateOne(
        { provider: "google_youtube" },
        {
          $set: {
            access_token: data.access_token,
            expires_at: new Date(Date.now() + (data.expires_in || 3600) * 1000),
            updated_at: new Date(),
          },
        }
      );

      return data.access_token;
    }
    console.error("[YouTube] Token refresh response had no access_token:", responseText.slice(0, 200));
    return null;
  } catch (err) {
    console.error("[YouTube] Token refresh exception:", err instanceof Error ? err.message : err);
    return null;
  }
}

export async function getYouTubeStats(channelId: string): Promise<SocialStats> {
  try {
    console.log("[YouTube] getYouTubeStats called for channel:", channelId);

    // Confirmed Vercel env vars: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, YOUTUBE_CHANNEL_ID
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    console.log("[YouTube] Env vars check:");
    console.log("[YouTube]   GOOGLE_CLIENT_ID:", !!clientId);
    console.log("[YouTube]   GOOGLE_CLIENT_SECRET:", !!clientSecret);
    console.log("[YouTube]   YOUTUBE_CHANNEL_ID:", process.env.YOUTUBE_CHANNEL_ID || "(not set)");

    if (!clientId || !clientSecret) {
      const missing: string[] = [];
      if (!clientId) missing.push("GOOGLE_CLIENT_ID");
      if (!clientSecret) missing.push("GOOGLE_CLIENT_SECRET");
      throw new Error(
        `YouTube credentials missing in Vercel: ${missing.join(", ")}. ` +
        `Have: ${[clientId && "GOOGLE_CLIENT_ID", clientSecret && "GOOGLE_CLIENT_SECRET"].filter(Boolean).join(", ") || "nothing"}.`
      );
    }

    // Get access token by refreshing stored OAuth token from MongoDB
    console.log("[YouTube] Requesting access token via refresh_token from MongoDB...");
    const accessToken = await getYouTubeAccessToken();

    if (!accessToken) {
      throw new Error(
        "YouTube: have GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET but no valid OAuth token. " +
        "Visit /api/auth/google to authorize YouTube access. " +
        "CLIENT_ID: " + clientId.slice(0, 12) + "..."
      );
    }

    const authParam = `access_token=${accessToken}`;

    // ── Fetch channel stats ──
    console.log("[YouTube] Fetching channel stats for:", channelId);
    const channelRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&${authParam}`
    );
    if (!channelRes.ok) {
      const errText = await channelRes.text();
      console.error("[YouTube] Channel fetch failed:", channelRes.status, errText.slice(0, 400));

      // Quota exceeded — return cached stats instead of error
      if (channelRes.status === 403 && errText.includes("quota")) {
        console.log("[YouTube] Quota exceeded — returning cached stats");
        try {
          const db = await getDb();
          const cached = await db.collection("social_stats").findOne({ platform: "youtube" });
          if (cached) {
            return {
              platform: "youtube",
              followers: cached.followers || 0,
              posts: cached.posts || 0,
              engagementRate: cached.engagementRate || 0,
              recentPosts: cached.recentPosts || [],
              connected: true,
              fetchedAt: cached.fetchedAt || new Date().toISOString(),
              error: "quota_exceeded",
            };
          }
        } catch { /* fall through */ }
        return {
          platform: "youtube",
          followers: 0, posts: 0, engagementRate: 0, recentPosts: [],
          connected: true,
          fetchedAt: new Date().toISOString(),
          error: "quota_exceeded",
        };
      }

      throw new Error(`YouTube API ${channelRes.status}: ${errText.slice(0, 300)}`);
    }
    const channelData: { items?: Array<{ statistics: { subscriberCount: string; videoCount: string } }> } = await channelRes.json();
    const channel = channelData.items?.[0];
    if (!channel) {
      console.error("[YouTube] Channel not found. Full response:", JSON.stringify(channelData).slice(0, 300));
      throw new Error(`Channel "${channelId}" not found — check YOUTUBE_CHANNEL_ID is a valid channel ID (starts with UC...)`);
    }
    console.log("[YouTube] Channel found — subscribers:", channel.statistics.subscriberCount, "videos:", channel.statistics.videoCount);

    // ── Fetch recent videos ──
    const videosRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&maxResults=10&type=video&${authParam}`
    );
    const videosData: { items?: Array<{ id: { videoId: string }; snippet: { title: string; publishedAt: string } }> } =
      videosRes.ok ? await videosRes.json() : { items: [] };
    if (!videosRes.ok) {
      console.warn("[YouTube] Video search failed:", videosRes.status, await videosRes.text().catch(() => ""));
    }
    console.log("[YouTube] Found", videosData.items?.length || 0, "recent videos");

    const videoIds = (videosData.items || []).map((v) => v.id.videoId).join(",");
    let videoStats: Array<{ id: string; statistics: { viewCount: string; likeCount: string; commentCount: string } }> = [];
    if (videoIds) {
      const statsRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds}&${authParam}`
      );
      if (statsRes.ok) {
        const statsData: { items: typeof videoStats } = await statsRes.json();
        videoStats = statsData.items || [];
      } else {
        console.warn("[YouTube] Video stats fetch failed:", statsRes.status);
      }
    }

    const subscribers = parseInt(channel.statistics.subscriberCount) || 0;

    const recentPosts: SocialPost[] = (videosData.items || []).map((v) => {
      const stats = videoStats.find((s) => s.id === v.id.videoId);
      const views = parseInt(stats?.statistics.viewCount || "0");
      const likes = parseInt(stats?.statistics.likeCount || "0");
      const comments = parseInt(stats?.statistics.commentCount || "0");
      return {
        id: v.id.videoId,
        platform: "youtube" as SocialPlatform,
        text: v.snippet.title,
        url: `https://youtube.com/watch?v=${v.id.videoId}`,
        likes, comments, shares: 0, views,
        createdAt: v.snippet.publishedAt,
        engagementRate: views > 0 ? ((likes + comments) / views) * 100 : 0,
      };
    });

    console.log("[YouTube] SUCCESS — subscribers:", subscribers, "videos:", recentPosts.length);
    return {
      platform: "youtube",
      followers: subscribers,
      posts: parseInt(channel.statistics.videoCount) || 0,
      engagementRate: recentPosts.length > 0
        ? recentPosts.reduce((s, p) => s + p.engagementRate, 0) / recentPosts.length : 0,
      recentPosts,
      connected: true,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "YouTube API error";
    console.error("[YouTube] FAILED:", errMsg);
    return {
      platform: "youtube", followers: 0, posts: 0, engagementRate: 0, recentPosts: [],
      fetchedAt: new Date().toISOString(),
      error: errMsg,
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════
//  TikTok — OAuth 2.0 User Token (stored in MongoDB via /api/auth/tiktok)
//  Env vars: TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET
//  User token: stored in MongoDB settings.tiktok_oauth after OAuth flow
// ══════════════════════════════════════════════════════════════════════════

interface TikTokOAuth {
  accessToken: string;
  refreshToken: string | null;
  openId: string | null;
  expiresAt: string | null;
  authorizedAt: string;
}

/**
 * Get TikTok user access token from MongoDB (set via OAuth flow).
 * Falls back to TIKTOK_ACCESS_TOKEN env var if set.
 * If token is expired, attempts refresh using refresh_token.
 */
async function getTikTokUserToken(): Promise<{ token: string; openId: string | null } | null> {
  // Check env var first (manual override)
  if (process.env.TIKTOK_ACCESS_TOKEN) {
    console.log("[TikTok] Using TIKTOK_ACCESS_TOKEN env var");
    return { token: process.env.TIKTOK_ACCESS_TOKEN, openId: null };
  }

  try {
    const db = await getDb();
    const oauth = await db.collection("settings").findOne({ key: "tiktok_oauth" }) as TikTokOAuth | null;

    if (!oauth?.accessToken) {
      console.log("[TikTok] No OAuth token found in DB — need to authorize via /api/auth/tiktok");
      return null;
    }

    // Check if token is expired
    if (oauth.expiresAt && new Date(oauth.expiresAt) < new Date()) {
      console.log("[TikTok] Token expired, attempting refresh...");
      const refreshed = await refreshTikTokToken(oauth.refreshToken);
      if (refreshed) return refreshed;
      console.log("[TikTok] Refresh failed — need to re-authorize");
      return null;
    }

    console.log("[TikTok] Using stored OAuth token (authorized:", oauth.authorizedAt, ")");
    return { token: oauth.accessToken, openId: oauth.openId };
  } catch (err) {
    console.error("[TikTok] Error reading OAuth token from DB:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Refresh an expired TikTok access token using the refresh token.
 */
async function refreshTikTokToken(refreshToken: string | null): Promise<{ token: string; openId: string | null } | null> {
  if (!refreshToken) return null;

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  if (!clientKey || !clientSecret) return null;

  try {
    const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    const text = await res.text();
    console.log("[TikTok] Refresh response:", res.status, text.slice(0, 300));

    if (!res.ok) return null;

    const data = JSON.parse(text) as {
      access_token?: string;
      refresh_token?: string;
      open_id?: string;
      expires_in?: number;
      refresh_expires_in?: number;
    };

    if (!data.access_token) return null;

    // Update stored tokens
    const db = await getDb();
    await db.collection("settings").updateOne(
      { key: "tiktok_oauth" },
      {
        $set: {
          accessToken: data.access_token,
          refreshToken: data.refresh_token || refreshToken,
          openId: data.open_id || null,
          expiresAt: data.expires_in
            ? new Date(Date.now() + data.expires_in * 1000).toISOString()
            : null,
          refreshedAt: new Date().toISOString(),
        },
      }
    );

    console.log("[TikTok] Token refreshed successfully");
    return { token: data.access_token, openId: data.open_id || null };
  } catch (err) {
    console.error("[TikTok] Refresh exception:", err instanceof Error ? err.message : err);
    return null;
  }
}

export async function getTikTokStats(): Promise<SocialStats> {
  const logs: string[] = [];
  const log = (msg: string) => { logs.push(`${new Date().toISOString().slice(11, 19)} ${msg}`); console.log(`[TikTok] ${msg}`); };

  try {
    log("getTikTokStats called");

    // Detect mode from stored OAuth token in MongoDB
    let storedMode: "sandbox" | "production" = "production";
    try {
      const db = await getDb();
      const oauthDoc = await db.collection("settings").findOne({ key: "tiktok_oauth" });
      if (oauthDoc?.mode === "sandbox") storedMode = "sandbox";
    } catch { /* ignore */ }

    const isSandbox = storedMode === "sandbox";
    const clientKey = isSandbox
      ? (process.env.TIKTOK_SANDBOX_CLIENT_KEY || process.env.TIKTOK_CLIENT_KEY)
      : process.env.TIKTOK_CLIENT_KEY;
    const clientSecret = isSandbox
      ? (process.env.TIKTOK_SANDBOX_CLIENT_SECRET || process.env.TIKTOK_CLIENT_SECRET)
      : process.env.TIKTOK_CLIENT_SECRET;

    log(`Mode: ${isSandbox ? "SANDBOX" : "PRODUCTION"}`);
    log(`Client key: ${clientKey ? clientKey.slice(0, 6) + "..." : "NOT SET"}`);

    if (!clientKey || !clientSecret) {
      log("ERROR: Missing credentials");
      throw new Error(`TikTok credentials missing: ${isSandbox ? "TIKTOK_SANDBOX_CLIENT_KEY" : "TIKTOK_CLIENT_KEY"}`);
    }

    // Get user OAuth token (from DB or env var)
    log("Fetching OAuth token from DB...");
    const userAuth = await getTikTokUserToken();
    if (!userAuth) {
      log("ERROR: No OAuth token found — need to authorize");
      throw new Error(
        "TikTok not authorized. Click 'Authorize TikTok' on the Growth page to connect your account."
      );
    }
    log(`Token found: ${userAuth.token.slice(0, 8)}...`);

    // Try stats fields first; if scope isn't approved, fall back to basic
    let followers = 0;
    let posts = 0;
    let likes = 0;
    let hasStatsScope = false;

    const statsFields = "follower_count,following_count,video_count,likes_count,display_name,avatar_url";
    const basicFields = "display_name,avatar_url";

    for (const fields of [statsFields, basicFields]) {
      const fieldLabel = fields === statsFields ? "stats+basic" : "basic only";
      log(`Calling /v2/user/info/ with ${fieldLabel} fields...`);

      const userRes = await fetch(
        `https://open.tiktokapis.com/v2/user/info/?fields=${fields}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${userAuth.token}` },
        }
      );

      if (userRes.ok) {
        const userData: {
          data?: {
            user?: {
              follower_count?: number;
              video_count?: number;
              likes_count?: number;
              display_name?: string;
            };
          };
        } = await userRes.json();

        const user = userData.data?.user;
        log(`OK (${userRes.status}) — display_name: ${user?.display_name || "(none)"}`);

        if (user?.follower_count !== undefined) {
          followers = user.follower_count;
          posts = user?.video_count || 0;
          likes = user?.likes_count || 0;
          hasStatsScope = true;
          log(`Stats: ${followers} followers, ${posts} videos, ${likes} likes`);
        } else {
          log("user.info.stats scope not available — only basic fields returned");
        }
        break;
      }

      const errText = await userRes.text();
      log(`FAILED (${userRes.status}): ${errText.slice(0, 150)}`);

      if (userRes.status === 401) {
        log("Token rejected (401) — may need re-authorization");
        return {
          platform: "tiktok",
          followers: 0, posts: 0, engagementRate: 0, recentPosts: [],
          connected: true,
          mode: storedMode,
          logs,
          fetchedAt: new Date().toISOString(),
          error: `TikTok token rejected (401) in ${storedMode} mode. Re-authorize via the button above.`,
        };
      }

      if (fields === statsFields) {
        log("Falling back to basic fields...");
        continue;
      }

      throw new Error(`TikTok API ${userRes.status}: ${errText.slice(0, 200)}`);
    }

    const engagementRate = posts > 0 ? Math.round((likes / posts / Math.max(followers, 1)) * 10000) / 100 : 0;

    // Fetch recent videos
    let recentPosts: SocialStats["recentPosts"] = [];
    try {
      log("Fetching recent videos via /v2/video/list/...");
      const videosRes = await fetch(
        "https://open.tiktokapis.com/v2/video/list/?fields=id,title,like_count,comment_count,view_count,share_count,create_time",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${userAuth.token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ max_count: 5 }),
        }
      );

      if (videosRes.ok) {
        const videosData: {
          data?: { videos?: Array<{ id: string; title?: string; like_count?: number; comment_count?: number; view_count?: number; share_count?: number; create_time?: number }> };
        } = await videosRes.json();
        recentPosts = (videosData.data?.videos || []).map((v) => ({
          id: v.id, platform: "tiktok" as const, text: v.title || "(no title)",
          likes: v.like_count || 0, comments: v.comment_count || 0, shares: v.share_count || 0, views: v.view_count || 0,
          engagementRate: v.view_count && v.view_count > 0 ? Math.round(((v.like_count || 0) + (v.comment_count || 0)) / v.view_count * 10000) / 100 : 0,
          createdAt: v.create_time ? new Date(v.create_time * 1000).toISOString() : new Date().toISOString(),
          url: `https://www.tiktok.com/@/video/${v.id}`,
        }));
        log(`Fetched ${recentPosts.length} recent videos`);
      } else {
        const errText = await videosRes.text();
        log(`Video list failed (${videosRes.status}): ${errText.slice(0, 100)}`);
      }
    } catch (videoErr) {
      log(`Video list error (non-fatal): ${videoErr instanceof Error ? videoErr.message : videoErr}`);
    }

    if (!hasStatsScope) {
      log("Connected with basic scope only — waiting for user.info.stats approval");
    }

    log("Done — success");
    return {
      platform: "tiktok",
      followers, posts, engagementRate, recentPosts,
      connected: true,
      mode: storedMode,
      logs,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "TikTok API error";
    log(`FAILED: ${errMsg}`);
    return {
      platform: "tiktok",
      followers: 0, posts: 0, engagementRate: 0, recentPosts: [],
      fetchedAt: new Date().toISOString(),
      error: errMsg,
      logs,
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════
//  Instagram — Graph API via Meta (coming soon — from AIGlitch pattern)
// ══════════════════════════════════════════════════════════════════════════

export async function getInstagramStats(userId?: string): Promise<SocialStats> {
  try {
    console.log("[Instagram] getInstagramStats called for user:", userId || "(none)");
    console.log("[Instagram] Env vars present:", {
      INSTAGRAM_ACCESS_TOKEN: !!process.env.INSTAGRAM_ACCESS_TOKEN,
      INSTAGRAM_USER_ID: process.env.INSTAGRAM_USER_ID || "(not set)",
      FACEBOOK_ACCESS_TOKEN: !!process.env.FACEBOOK_ACCESS_TOKEN,
    });
    // Instagram Business API uses Facebook's token infrastructure
    // FACEBOOK_ACCESS_TOKEN is the correct token (Facebook Page token with Instagram permissions)
    // INSTAGRAM_ACCESS_TOKEN is a fallback only — it's often the same token or a stale/invalid one
    const accessToken = process.env.FACEBOOK_ACCESS_TOKEN || process.env.INSTAGRAM_ACCESS_TOKEN;
    if (!accessToken) {
      const missing: string[] = [];
      if (!process.env.FACEBOOK_ACCESS_TOKEN) missing.push("FACEBOOK_ACCESS_TOKEN");
      if (!process.env.INSTAGRAM_ACCESS_TOKEN) missing.push("INSTAGRAM_ACCESS_TOKEN");
      throw new Error(`Instagram credentials missing — need at least one of: ${missing.join(", ")} in Vercel. Instagram Business accounts use Facebook Graph API tokens.`);
    }
    console.log("[Instagram] Using token from:", process.env.FACEBOOK_ACCESS_TOKEN ? "FACEBOOK_ACCESS_TOKEN" : "INSTAGRAM_ACCESS_TOKEN (fallback)");

    // Instagram Business accounts are accessed via Facebook Graph API (graph.facebook.com),
    // not the Instagram Basic Display API (graph.instagram.com)
    // Try Facebook Graph API first (for Instagram Business/Creator accounts)
    if (userId && userId !== "me") {
      const fbRes = await fetch(
        `https://graph.facebook.com/v21.0/${userId}?fields=id,username,name,media_count,followers_count&access_token=${accessToken}`
      );
      if (fbRes.ok) {
        const fbData: { id: string; username?: string; name?: string; media_count?: number; followers_count?: number } = await fbRes.json();

        const mediaRes = await fetch(
          `https://graph.facebook.com/v21.0/${fbData.id}/media?fields=id,caption,timestamp,like_count,comments_count,permalink&limit=10&access_token=${accessToken}`
        );
        const mediaData: { data?: Array<{
          id: string; caption?: string; timestamp: string;
          like_count?: number; comments_count?: number; permalink?: string;
        }> } = mediaRes.ok ? await mediaRes.json() : { data: [] };

        const followersCount = fbData.followers_count || 0;
        const recentPosts: SocialPost[] = (mediaData.data || []).map((m) => {
          const likes = m.like_count || 0;
          const comments = m.comments_count || 0;
          return {
            id: m.id,
            platform: "instagram" as SocialPlatform,
            text: m.caption || "",
            url: m.permalink || "",
            likes, comments, shares: 0, views: 0,
            createdAt: m.timestamp,
            engagementRate: followersCount > 0 ? ((likes + comments) / followersCount) * 100 : 0,
          };
        });

        return {
          platform: "instagram",
          followers: followersCount,
          posts: fbData.media_count || 0,
          engagementRate: recentPosts.length > 0
            ? recentPosts.reduce((s, p) => s + p.engagementRate, 0) / recentPosts.length : 0,
          recentPosts,
          connected: true,
          fetchedAt: new Date().toISOString(),
        };
      }
      // If Facebook Graph API fails, fall through to Instagram Basic Display API
    }

    // Fallback: Instagram Basic Display API
    const meRes = await fetch(
      `https://graph.instagram.com/${userId || "me"}?fields=id,username,media_count,followers_count&access_token=${accessToken}`
    );
    if (!meRes.ok) {
      const errText = await meRes.text();
      throw new Error(`Instagram API ${meRes.status}: ${errText.slice(0, 200)}`);
    }
    const meData: { id: string; username: string; media_count: number; followers_count: number } = await meRes.json();

    const mediaRes = await fetch(
      `https://graph.instagram.com/${meData.id}/media?fields=id,caption,timestamp,like_count,comments_count,permalink&limit=10&access_token=${accessToken}`
    );
    const mediaData: { data?: Array<{
      id: string; caption?: string; timestamp: string;
      like_count?: number; comments_count?: number; permalink?: string;
    }> } = mediaRes.ok ? await mediaRes.json() : { data: [] };

    const recentPosts: SocialPost[] = (mediaData.data || []).map((m) => {
      const likes = m.like_count || 0;
      const comments = m.comments_count || 0;
      return {
        id: m.id,
        platform: "instagram" as SocialPlatform,
        text: m.caption || "",
        url: m.permalink || "",
        likes, comments, shares: 0, views: 0,
        createdAt: m.timestamp,
        engagementRate: meData.followers_count > 0
          ? ((likes + comments) / meData.followers_count) * 100 : 0,
      };
    });

    return {
      platform: "instagram",
      followers: meData.followers_count,
      posts: meData.media_count,
      engagementRate: recentPosts.length > 0
        ? recentPosts.reduce((s, p) => s + p.engagementRate, 0) / recentPosts.length : 0,
      recentPosts,
      connected: true,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      platform: "instagram", followers: 0, posts: 0, engagementRate: 0, recentPosts: [],
      connected: !!(process.env.INSTAGRAM_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN),
      fetchedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Instagram API error",
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════
//  Unified Stats Fetcher
// ══════════════════════════════════════════════════════════════════════════

export async function getAllSocialStats(config: {
  xUsername?: string;
  youtubeChannelId?: string;
  facebookPageId?: string;
  instagramUserId?: string;
  tiktokUsername?: string;
}): Promise<SocialStats[]> {
  const results = await Promise.allSettled([
    config.xUsername
      ? getXStats(config.xUsername)
      : Promise.resolve({ platform: "x" as SocialPlatform, followers: 0, posts: 0, engagementRate: 0, recentPosts: [], fetchedAt: new Date().toISOString(), error: "X account pending sync" }),
    config.youtubeChannelId
      ? getYouTubeStats(config.youtubeChannelId)
      : Promise.resolve({ platform: "youtube" as SocialPlatform, followers: 0, posts: 0, engagementRate: 0, recentPosts: [], fetchedAt: new Date().toISOString(), error: "YouTube channel pending sync" }),
    config.facebookPageId
      ? getFacebookStats(config.facebookPageId)
      : Promise.resolve({ platform: "facebook" as SocialPlatform, followers: 0, posts: 0, engagementRate: 0, recentPosts: [], fetchedAt: new Date().toISOString(), error: "Facebook page pending sync" }),
    config.instagramUserId
      ? getInstagramStats(config.instagramUserId)
      : Promise.resolve({ platform: "instagram" as SocialPlatform, followers: 0, posts: 0, engagementRate: 0, recentPosts: [], fetchedAt: new Date().toISOString(), error: "Instagram coming soon" }),
    // TikTok uses CLIENT_KEY + CLIENT_SECRET directly — no username needed to trigger
    (process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET)
      ? getTikTokStats()
      : Promise.resolve({ platform: "tiktok" as SocialPlatform, followers: 0, posts: 0, engagementRate: 0, recentPosts: [], fetchedAt: new Date().toISOString(), error: "TikTok: TIKTOK_CLIENT_KEY + TIKTOK_CLIENT_SECRET not set" }),
  ]);

  return results.map((r, i) => {
    const platforms: SocialPlatform[] = ["x", "youtube", "facebook", "instagram", "tiktok"];
    return r.status === "fulfilled" ? r.value : {
      platform: platforms[i], followers: 0, posts: 0, engagementRate: 0,
      recentPosts: [], fetchedAt: new Date().toISOString(), error: "Fetch failed",
    };
  });
}

// ══════════════════════════════════════════════════════════════════════════
//  Instagram — Content Publishing API (Graph API v21.0)
//  Posts images with captions to Instagram Business/Creator accounts.
//  Instagram requires an image_url for every post — no text-only posts.
//  Flow: 1) Create media container → 2) Publish container
//  Env vars: INSTAGRAM_USER_ID, INSTAGRAM_ACCESS_TOKEN (or FACEBOOK_ACCESS_TOKEN)
// ══════════════════════════════════════════════════════════════════════════

export async function postToInstagram(
  caption: string,
  imageUrl: string,
  igUserId?: string
): Promise<PostResult> {
  try {
    const userId = igUserId || process.env.INSTAGRAM_USER_ID;
    const accessToken = process.env.FACEBOOK_ACCESS_TOKEN || process.env.INSTAGRAM_ACCESS_TOKEN;

    if (!userId) {
      return { success: false, error: "INSTAGRAM_USER_ID not set in Vercel env vars" };
    }
    if (!accessToken) {
      return { success: false, error: "FACEBOOK_ACCESS_TOKEN (or INSTAGRAM_ACCESS_TOKEN) not set in Vercel env vars" };
    }
    if (!imageUrl) {
      return { success: false, error: "Instagram requires an image URL — text-only posts are not supported" };
    }

    console.log("[Instagram] Creating media container for user:", userId);

    // Step 1: Create media container
    const createRes = await fetch(
      `https://graph.facebook.com/v21.0/${userId}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: imageUrl,
          caption,
          access_token: accessToken,
        }),
      }
    );

    if (!createRes.ok) {
      const errBody = await createRes.text();
      return { success: false, error: `Instagram container creation failed ${createRes.status}: ${errBody.slice(0, 300)}` };
    }

    const createData: { id?: string } = await createRes.json();
    const containerId = createData.id;
    if (!containerId) {
      return { success: false, error: "Instagram: no container ID returned" };
    }

    console.log("[Instagram] Container created:", containerId, "— publishing...");

    // Step 2: Publish the container
    const publishRes = await fetch(
      `https://graph.facebook.com/v21.0/${userId}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: accessToken,
        }),
      }
    );

    if (!publishRes.ok) {
      const errBody = await publishRes.text();
      return { success: false, error: `Instagram publish failed ${publishRes.status}: ${errBody.slice(0, 300)}` };
    }

    const publishData: { id?: string } = await publishRes.json();
    const mediaId = publishData.id;

    console.log("[Instagram] Published successfully, media ID:", mediaId);

    // Get permalink for the published post
    let platformUrl: string | undefined;
    if (mediaId) {
      const permalinkRes = await fetch(
        `https://graph.facebook.com/v21.0/${mediaId}?fields=permalink&access_token=${accessToken}`
      );
      if (permalinkRes.ok) {
        const permalinkData: { permalink?: string } = await permalinkRes.json();
        platformUrl = permalinkData.permalink;
      }
    }

    return {
      success: true,
      platformPostId: mediaId,
      platformUrl,
    };
  } catch (err) {
    return { success: false, error: `Instagram error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// ══════════════════════════════════════════════════════════════════════════
//  Unified Publisher (same pattern as AIGlitch's postToPlatform dispatcher)
// ══════════════════════════════════════════════════════════════════════════

export async function publishToplatform(
  platform: SocialPlatform,
  text: string,
  config: { facebookPageId?: string; facebookAccessToken?: string; instagramImageUrl?: string }
): Promise<PostResult> {
  switch (platform) {
    case "x":
      return postToX(text);
    case "facebook":
      return postToFacebook(text, config.facebookPageId || "", config.facebookAccessToken || process.env.FACEBOOK_ACCESS_TOKEN || "");
    case "instagram":
      return postToInstagram(text, config.instagramImageUrl || "");
    case "youtube":
      return { success: false, error: "YouTube requires video content — use YouTube Studio" };
    case "tiktok":
      return { success: false, error: "TikTok requires video content — sandboxed" };
    default:
      return { success: false, error: `Unknown platform: ${platform}` };
  }
}

