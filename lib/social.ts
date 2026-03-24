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
    const userToken = process.env.FACEBOOK_ACCESS_TOKEN;
    if (!userToken) throw new Error("FACEBOOK_ACCESS_TOKEN not set in Vercel");

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
//  YouTube — Data API v3 (from AIGlitch, sometimes has token issues)
// ══════════════════════════════════════════════════════════════════════════

async function refreshYouTubeToken(): Promise<string | null> {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) return null;

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!res.ok) {
      console.error("[YouTube token refresh]", res.status, await res.text());
      return null;
    }

    const data = await res.json() as { access_token?: string };
    return data.access_token || null;
  } catch (err) {
    console.error("[YouTube token refresh error]", err instanceof Error ? err.message : err);
    return null;
  }
}

export async function getYouTubeStats(channelId: string): Promise<SocialStats> {
  try {
    // Try API key first, then OAuth access token (AIGlitch uses YOUTUBE_ACCESS_TOKEN)
    const apiKey = process.env.YOUTUBE_API_KEY;
    let accessToken = process.env.YOUTUBE_ACCESS_TOKEN;
    if (!accessToken && !apiKey) {
      // Try refreshing OAuth token
      accessToken = await refreshYouTubeToken() || undefined;
    }
    if (!apiKey && !accessToken) {
      throw new Error("No YouTube credentials — set YOUTUBE_API_KEY or YOUTUBE_ACCESS_TOKEN in Vercel");
    }

    // YouTube Data API v3 accepts either key= or access_token= param
    const authParam = apiKey ? `key=${apiKey}` : `access_token=${accessToken}`;

    const channelRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&${authParam}`
    );
    if (!channelRes.ok) {
      const errText = await channelRes.text();
      throw new Error(`YouTube API ${channelRes.status}: ${errText.slice(0, 200)}`);
    }
    const channelData: { items?: Array<{ statistics: { subscriberCount: string; videoCount: string } }> } = await channelRes.json();
    const channel = channelData.items?.[0];
    if (!channel) throw new Error(`Channel ${channelId} not found — check YOUTUBE_CHANNEL_ID`);

    const videosRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&maxResults=10&type=video&${authParam}`
    );
    const videosData: { items?: Array<{ id: { videoId: string }; snippet: { title: string; publishedAt: string } }> } =
      videosRes.ok ? await videosRes.json() : { items: [] };

    const videoIds = (videosData.items || []).map((v) => v.id.videoId).join(",");
    let videoStats: Array<{ id: string; statistics: { viewCount: string; likeCount: string; commentCount: string } }> = [];
    if (videoIds) {
      const statsRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds}&${authParam}`
      );
      if (statsRes.ok) {
        const statsData: { items: typeof videoStats } = await statsRes.json();
        videoStats = statsData.items || [];
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

    return {
      platform: "youtube",
      followers: subscribers,
      posts: parseInt(channel.statistics.videoCount) || 0,
      engagementRate: recentPosts.length > 0
        ? recentPosts.reduce((s, p) => s + p.engagementRate, 0) / recentPosts.length : 0,
      recentPosts,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      platform: "youtube", followers: 0, posts: 0, engagementRate: 0, recentPosts: [],
      fetchedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : "YouTube API error",
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════
//  TikTok — Content Posting API (from AIGlitch, sandboxed/limited)
// ══════════════════════════════════════════════════════════════════════════

async function refreshTikTokToken(): Promise<string | null> {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  const refreshToken = process.env.TIKTOK_REFRESH_TOKEN;

  if (!clientKey || !clientSecret || !refreshToken) return null;

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
    const data = await res.json() as { access_token?: string };
    return data.access_token || null;
  } catch (err) {
    console.error("[TikTok] Token refresh error:", err);
    return null;
  }
}

export async function getTikTokStats(): Promise<SocialStats> {
  try {
    let accessToken = process.env.TIKTOK_ACCESS_TOKEN || process.env.TIKTOK_TOKEN;
    if (!accessToken) {
      accessToken = await refreshTikTokToken() || undefined;
    }
    if (!accessToken) {
      const hasRefreshCreds = !!(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET && process.env.TIKTOK_REFRESH_TOKEN);
      throw new Error(
        hasRefreshCreds
          ? "TikTok token refresh failed — TIKTOK_REFRESH_TOKEN may be expired, re-authenticate via OAuth"
          : "No TikTok credentials — set TIKTOK_ACCESS_TOKEN in Vercel (or TIKTOK_CLIENT_KEY + TIKTOK_CLIENT_SECRET + TIKTOK_REFRESH_TOKEN for auto-refresh)"
      );
    }

    // Query user info (sandboxed — may only return own data)
    const userRes = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=follower_count,following_count,video_count,display_name", {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userRes.ok) {
      // Try token refresh on 401
      if (userRes.status === 401) {
        const refreshed = await refreshTikTokToken();
        if (refreshed) {
          const retryRes = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=follower_count,following_count,video_count,display_name", {
            headers: { Authorization: `Bearer ${refreshed}` },
          });
          if (retryRes.ok) {
            const retryData: { data?: { user?: { follower_count?: number; video_count?: number } } } = await retryRes.json();
            return {
              platform: "tiktok",
              followers: retryData.data?.user?.follower_count || 0,
              posts: retryData.data?.user?.video_count || 0,
              engagementRate: 0,
              recentPosts: [],
              fetchedAt: new Date().toISOString(),
            };
          }
        }
        throw new Error("TikTok token expired — refresh failed");
      }
      throw new Error(`TikTok API: ${userRes.status}`);
    }

    const userData: { data?: { user?: { follower_count?: number; video_count?: number } } } = await userRes.json();

    return {
      platform: "tiktok",
      followers: userData.data?.user?.follower_count || 0,
      posts: userData.data?.user?.video_count || 0,
      engagementRate: 0,
      recentPosts: [],
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      platform: "tiktok", followers: 0, posts: 0, engagementRate: 0, recentPosts: [],
      fetchedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : "TikTok API error (sandboxed)",
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════
//  Instagram — Graph API via Meta (coming soon — from AIGlitch pattern)
// ══════════════════════════════════════════════════════════════════════════

export async function getInstagramStats(userId?: string): Promise<SocialStats> {
  try {
    // Instagram Business API uses Facebook's token infrastructure
    // Try INSTAGRAM_ACCESS_TOKEN first, fall back to FACEBOOK_ACCESS_TOKEN
    const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN;
    if (!accessToken) throw new Error("No Instagram token — set INSTAGRAM_ACCESS_TOKEN or FACEBOOK_ACCESS_TOKEN in Vercel");

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
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      platform: "instagram", followers: 0, posts: 0, engagementRate: 0, recentPosts: [],
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
    config.tiktokUsername
      ? getTikTokStats()
      : Promise.resolve({ platform: "tiktok" as SocialPlatform, followers: 0, posts: 0, engagementRate: 0, recentPosts: [], fetchedAt: new Date().toISOString(), error: "TikTok sandboxed — limited API access" }),
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
//  Unified Publisher (same pattern as AIGlitch's postToPlatform dispatcher)
// ══════════════════════════════════════════════════════════════════════════

export async function publishToplatform(
  platform: SocialPlatform,
  text: string,
  config: { facebookPageId?: string; facebookAccessToken?: string }
): Promise<PostResult> {
  switch (platform) {
    case "x":
      return postToX(text);
    case "facebook":
      return postToFacebook(text, config.facebookPageId || "", config.facebookAccessToken || process.env.FACEBOOK_ACCESS_TOKEN || "");
    case "youtube":
      return { success: false, error: "YouTube requires video content — use YouTube Studio" };
    case "tiktok":
      return { success: false, error: "TikTok requires video content — sandboxed" };
    case "instagram":
      return { success: false, error: "Instagram requires media — coming soon" };
    default:
      return { success: false, error: `Unknown platform: ${platform}` };
  }
}

export { refreshYouTubeToken };
