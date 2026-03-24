import { SocialStats, SocialPost, SocialPlatform } from "./types";

// ─── X / Twitter ────────────────────────────────────────────
const X_API_KEY = process.env.X_API_KEY || "";
const X_API_SECRET = process.env.X_API_SECRET || "";
const X_ACCESS_TOKEN = process.env.X_ACCESS_TOKEN || "";
const X_ACCESS_SECRET = process.env.X_ACCESS_SECRET || "";

async function getXBearerToken(): Promise<string> {
  if (!X_API_KEY || !X_API_SECRET) throw new Error("X API keys not set");
  const credentials = Buffer.from(`${X_API_KEY}:${X_API_SECRET}`).toString("base64");
  const res = await fetch("https://api.twitter.com/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`X auth error: ${res.status}`);
  const data: { access_token: string } = await res.json();
  return data.access_token;
}

export async function getXStats(username: string): Promise<SocialStats> {
  try {
    const token = X_ACCESS_TOKEN || await getXBearerToken();
    const userRes = await fetch(
      `https://api.twitter.com/2/users/by/username/${username}?user.fields=public_metrics`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!userRes.ok) throw new Error(`X API: ${userRes.status}`);
    const userData: { data: { id: string; public_metrics: { followers_count: number; tweet_count: number } } } = await userRes.json();

    const tweetsRes = await fetch(
      `https://api.twitter.com/2/users/${userData.data.id}/tweets?max_results=10&tweet.fields=public_metrics,created_at`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const tweetsData: { data?: Array<{ id: string; text: string; created_at: string; public_metrics: { like_count: number; reply_count: number; retweet_count: number; impression_count: number } }> } =
      tweetsRes.ok ? await tweetsRes.json() : { data: [] };

    const recentPosts: SocialPost[] = (tweetsData.data || []).map((t) => ({
      id: t.id,
      platform: "x" as SocialPlatform,
      text: t.text,
      url: `https://x.com/${username}/status/${t.id}`,
      likes: t.public_metrics.like_count,
      comments: t.public_metrics.reply_count,
      shares: t.public_metrics.retweet_count,
      views: t.public_metrics.impression_count || 0,
      createdAt: t.created_at,
      engagementRate: userData.data.public_metrics.followers_count > 0
        ? ((t.public_metrics.like_count + t.public_metrics.reply_count + t.public_metrics.retweet_count) / userData.data.public_metrics.followers_count) * 100
        : 0,
    }));

    const avgEngagement = recentPosts.length > 0
      ? recentPosts.reduce((sum, p) => sum + p.engagementRate, 0) / recentPosts.length
      : 0;

    return {
      platform: "x",
      followers: userData.data.public_metrics.followers_count,
      posts: userData.data.public_metrics.tweet_count,
      engagementRate: avgEngagement,
      recentPosts,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      platform: "x",
      followers: 0,
      posts: 0,
      engagementRate: 0,
      recentPosts: [],
      fetchedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : "X API error",
    };
  }
}

export async function postToX(text: string): Promise<{ id: string; success: boolean }> {
  if (!X_ACCESS_TOKEN || !X_ACCESS_SECRET) throw new Error("X access tokens not set");
  // OAuth 1.0a signing needed — use a simplified approach with Bearer token for v2
  const res = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${X_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`X post error: ${res.status} ${err}`);
  }
  const data: { data: { id: string } } = await res.json();
  return { id: data.data.id, success: true };
}

// ─── YouTube ────────────────────────────────────────────
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || "";

export async function getYouTubeStats(channelId: string): Promise<SocialStats> {
  try {
    if (!YOUTUBE_API_KEY) throw new Error("YOUTUBE_API_KEY not set");

    const channelRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${YOUTUBE_API_KEY}`
    );
    if (!channelRes.ok) throw new Error(`YouTube API: ${channelRes.status}`);
    const channelData: { items: Array<{ statistics: { subscriberCount: string; videoCount: string }; snippet: { title: string } }> } = await channelRes.json();
    const channel = channelData.items?.[0];
    if (!channel) throw new Error("Channel not found");

    const videosRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&maxResults=10&type=video&key=${YOUTUBE_API_KEY}`
    );
    const videosData: { items?: Array<{ id: { videoId: string }; snippet: { title: string; publishedAt: string } }> } =
      videosRes.ok ? await videosRes.json() : { items: [] };

    const videoIds = (videosData.items || []).map((v) => v.id.videoId).join(",");
    let videoStats: Array<{ id: string; statistics: { viewCount: string; likeCount: string; commentCount: string } }> = [];
    if (videoIds) {
      const statsRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds}&key=${YOUTUBE_API_KEY}`
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
        likes,
        comments,
        shares: 0,
        views,
        createdAt: v.snippet.publishedAt,
        engagementRate: views > 0 ? ((likes + comments) / views) * 100 : 0,
      };
    });

    return {
      platform: "youtube",
      followers: subscribers,
      posts: parseInt(channel.statistics.videoCount) || 0,
      engagementRate: recentPosts.length > 0
        ? recentPosts.reduce((s, p) => s + p.engagementRate, 0) / recentPosts.length
        : 0,
      recentPosts,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      platform: "youtube",
      followers: 0, posts: 0, engagementRate: 0, recentPosts: [],
      fetchedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : "YouTube API error",
    };
  }
}

// ─── Facebook ────────────────────────────────────────────
const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN || "";

export async function getFacebookStats(pageId: string): Promise<SocialStats> {
  try {
    if (!FACEBOOK_ACCESS_TOKEN) throw new Error("FACEBOOK_ACCESS_TOKEN not set");

    const pageRes = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}?fields=fan_count,name&access_token=${FACEBOOK_ACCESS_TOKEN}`
    );
    if (!pageRes.ok) throw new Error(`Facebook API: ${pageRes.status}`);
    const pageData: { fan_count: number; name: string } = await pageRes.json();

    const postsRes = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}/posts?fields=message,created_time,likes.summary(true),comments.summary(true),shares&limit=10&access_token=${FACEBOOK_ACCESS_TOKEN}`
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
        engagementRate: pageData.fan_count > 0
          ? ((likes + comments + shares) / pageData.fan_count) * 100 : 0,
      };
    });

    return {
      platform: "facebook",
      followers: pageData.fan_count,
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

// ─── Instagram ────────────────────────────────────────────
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN || "";

export async function getInstagramStats(userId?: string): Promise<SocialStats> {
  try {
    if (!INSTAGRAM_ACCESS_TOKEN) throw new Error("INSTAGRAM_ACCESS_TOKEN not set");

    const meRes = await fetch(
      `https://graph.instagram.com/${userId || "me"}?fields=id,username,media_count,followers_count&access_token=${INSTAGRAM_ACCESS_TOKEN}`
    );
    if (!meRes.ok) throw new Error(`Instagram API: ${meRes.status}`);
    const meData: { id: string; username: string; media_count: number; followers_count: number } = await meRes.json();

    const mediaRes = await fetch(
      `https://graph.instagram.com/${meData.id}/media?fields=id,caption,timestamp,like_count,comments_count,media_url,permalink&limit=10&access_token=${INSTAGRAM_ACCESS_TOKEN}`
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

// ─── TikTok ────────────────────────────────────────────
const TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY || "";
const TIKTOK_CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET || "";

export async function getTikTokStats(): Promise<SocialStats> {
  try {
    if (!TIKTOK_CLIENT_KEY || !TIKTOK_CLIENT_SECRET) throw new Error("TikTok keys not set");

    // TikTok API v2 requires OAuth — return placeholder when no user token available
    return {
      platform: "tiktok",
      followers: 0, posts: 0, engagementRate: 0, recentPosts: [],
      fetchedAt: new Date().toISOString(),
      error: "TikTok requires OAuth user flow — configure access token in settings",
    };
  } catch (error) {
    return {
      platform: "tiktok", followers: 0, posts: 0, engagementRate: 0, recentPosts: [],
      fetchedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : "TikTok API error",
    };
  }
}

// ─── Unified ────────────────────────────────────────────

export async function getAllSocialStats(config: {
  xUsername?: string;
  youtubeChannelId?: string;
  facebookPageId?: string;
  instagramUserId?: string;
}): Promise<SocialStats[]> {
  const results = await Promise.allSettled([
    config.xUsername ? getXStats(config.xUsername) : Promise.resolve({ platform: "x" as SocialPlatform, followers: 0, posts: 0, engagementRate: 0, recentPosts: [], fetchedAt: new Date().toISOString(), error: "X username not configured" }),
    config.youtubeChannelId ? getYouTubeStats(config.youtubeChannelId) : Promise.resolve({ platform: "youtube" as SocialPlatform, followers: 0, posts: 0, engagementRate: 0, recentPosts: [], fetchedAt: new Date().toISOString(), error: "YouTube channel ID not configured" }),
    config.facebookPageId ? getFacebookStats(config.facebookPageId) : Promise.resolve({ platform: "facebook" as SocialPlatform, followers: 0, posts: 0, engagementRate: 0, recentPosts: [], fetchedAt: new Date().toISOString(), error: "Facebook page ID not configured" }),
    config.instagramUserId ? getInstagramStats(config.instagramUserId) : Promise.resolve({ platform: "instagram" as SocialPlatform, followers: 0, posts: 0, engagementRate: 0, recentPosts: [], fetchedAt: new Date().toISOString(), error: "Instagram not configured" }),
    getTikTokStats(),
  ]);

  return results.map((r) =>
    r.status === "fulfilled" ? r.value : {
      platform: "x" as SocialPlatform, followers: 0, posts: 0, engagementRate: 0,
      recentPosts: [], fetchedAt: new Date().toISOString(), error: "Fetch failed",
    }
  );
}
