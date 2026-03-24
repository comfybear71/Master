"use client";

import { useEffect, useState, useCallback } from "react";
import { SocialStats, Campaign, ViralAlert, SocialPlatform, Project } from "@/lib/types";

const platformLabels: Record<SocialPlatform, string> = {
  x: "X / Twitter",
  youtube: "YouTube",
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
};

const platformIcons: Record<SocialPlatform, string> = {
  x: "\ud835\udd4f",
  youtube: "\u25b6",
  facebook: "f",
  instagram: "\u25ce",
  tiktok: "\u266a",
};

const platformColors: Record<SocialPlatform, string> = {
  x: "border-slate-500/30 bg-slate-500/5",
  youtube: "border-red-500/30 bg-red-500/5",
  facebook: "border-blue-500/30 bg-blue-500/5",
  instagram: "border-pink-500/30 bg-pink-500/5",
  tiktok: "border-cyan-500/30 bg-cyan-500/5",
};

type TabType = "overview" | "campaigns" | "viral";

export default function GrowthPage() {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [stats, setStats] = useState<SocialStats[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [alerts, setAlerts] = useState<ViralAlert[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Campaign form
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [campaignBrief, setCampaignBrief] = useState("");
  const [campaignProject, setCampaignProject] = useState("");
  const [campaignAudience, setCampaignAudience] = useState("");

  // Social config
  const [showConfig, setShowConfig] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [socialConfig, setSocialConfig] = useState({
    xUsername: "",
    youtubeChannelId: "",
    facebookPageId: "",
    instagramUserId: "",
    tiktokUsername: "",
  });

  // Load saved config on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await fetch("/api/social?action=config");
        if (res.ok) {
          const data = await res.json();
          setSocialConfig((prev) => ({
            xUsername: data.xUsername || prev.xUsername,
            youtubeChannelId: data.youtubeChannelId || prev.youtubeChannelId,
            facebookPageId: data.facebookPageId || prev.facebookPageId,
            instagramUserId: data.instagramUserId || prev.instagramUserId,
            tiktokUsername: data.tiktokUsername || prev.tiktokUsername,
          }));
          // If no config has been saved yet, show the config panel automatically
          const hasAnyConfig = data.xUsername || data.youtubeChannelId || data.facebookPageId || data.instagramUserId || data.tiktokUsername;
          if (!hasAnyConfig) {
            setShowConfig(true);
          }
        }
      } catch {
        // silently fail
      }
      setConfigLoaded(true);
    };
    loadConfig();
  }, []);

  const fetchAll = useCallback(async () => {
    const [statsRes, campaignsRes, alertsRes, projectsRes] = await Promise.allSettled([
      fetch("/api/social?action=cached"),
      fetch("/api/campaigns"),
      fetch("/api/viral"),
      fetch("/api/projects"),
    ]);

    if (statsRes.status === "fulfilled" && statsRes.value.ok) {
      const data = await statsRes.value.json();
      setStats(Array.isArray(data) ? data : []);
    }
    if (campaignsRes.status === "fulfilled" && campaignsRes.value.ok) {
      setCampaigns(await campaignsRes.value.json());
    }
    if (alertsRes.status === "fulfilled" && alertsRes.value.ok) {
      setAlerts(await alertsRes.value.json());
    }
    if (projectsRes.status === "fulfilled" && projectsRes.value.ok) {
      setProjects(await projectsRes.value.json());
    }

    setLastRefresh(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 60000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const refreshStats = async () => {
    setLoading(true);
    try {
      // Server reads config from MongoDB, no need to pass via query params
      const res = await fetch("/api/social?action=stats");
      if (res.ok) setStats(await res.json());
    } catch {
      // silently fail
    }
    setLoading(false);
  };

  const saveConfig = async () => {
    setSavingConfig(true);
    try {
      await fetch("/api/social?action=configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(socialConfig),
      });
      setShowConfig(false);
      await refreshStats();
    } catch {
      // silently fail
    }
    setSavingConfig(false);
  };

  const generateCampaign = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/campaigns?action=generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: campaignBrief,
          projectName: campaignProject,
          targetAudience: campaignAudience,
        }),
      });
      if (res.ok) {
        await fetchAll();
        setShowCampaignForm(false);
        setCampaignBrief("");
        setCampaignProject("");
        setCampaignAudience("");
        setActiveTab("campaigns");
      }
    } catch {
      // silently fail
    }
    setGenerating(false);
  };

  const publishCampaign = async (campaignId: string) => {
    setPublishing(campaignId);
    try {
      await fetch("/api/campaigns?action=publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId }),
      });
      await fetchAll();
    } catch {
      // silently fail
    }
    setPublishing(null);
  };

  const deleteCampaign = async (campaignId: string) => {
    await fetch("/api/campaigns?action=delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId }),
    });
    fetchAll();
  };

  const scanViral = async () => {
    await fetch("/api/viral?action=scan", { method: "POST" });
    fetchAll();
  };

  const generateFollowUp = async (alertId: string) => {
    await fetch("/api/viral?action=generate-followup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertId }),
    });
    fetchAll();
  };

  const dismissAlert = async (alertId: string) => {
    await fetch("/api/viral?action=dismiss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertId }),
    });
    fetchAll();
  };

  const totalFollowers = stats.reduce((s, p) => s + (p.followers || 0), 0);
  const avgEngagement = stats.filter((s) => s.engagementRate > 0).length > 0
    ? stats.reduce((s, p) => s + p.engagementRate, 0) / stats.filter((s) => s.engagementRate > 0).length
    : 0;
  const activeAlerts = alerts.filter((a) => a.status === "new").length;

  const tabs: { key: TabType; label: string }[] = [
    { key: "overview", label: "Social Overview" },
    { key: "campaigns", label: `Campaigns (${campaigns.length})` },
    { key: "viral", label: `Viral Alerts (${activeAlerts})` },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Growth Engine</h1>
          <p className="text-sm text-slate-500 mt-1">
            Social media, campaigns, and viral detection — Last: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowConfig(!showConfig)} className="px-4 py-2 bg-slate-700/50 text-slate-300 border border-slate-600 rounded-lg text-sm hover:bg-slate-700 transition-colors font-mono">
            Configure
          </button>
          <button onClick={() => setShowCampaignForm(!showCampaignForm)} className="px-4 py-2 bg-accent/10 text-accent border border-accent/20 rounded-lg text-sm hover:bg-accent/20 transition-colors font-mono">
            + New Campaign
          </button>
          <button onClick={refreshStats} className="px-4 py-2 bg-success/10 text-success border border-success/20 rounded-lg text-sm hover:bg-success/20 transition-colors font-mono">
            Refresh Stats
          </button>
        </div>
      </div>

      {/* Social Config Panel */}
      {showConfig && (
        <div className="bg-base-card rounded-xl border border-accent/20 p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-1">Social Media Configuration</h2>
          <p className="text-sm text-slate-400 mb-4">Enter your account IDs below. These are saved to the database and used to fetch live stats from each platform.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block flex items-center gap-1.5">
                <span className="text-base">{platformIcons.x}</span> X / Twitter Username
              </label>
              <input value={socialConfig.xUsername} onChange={(e) => setSocialConfig({ ...socialConfig, xUsername: e.target.value })} placeholder="username (without @)" className="w-full bg-base border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-accent focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block flex items-center gap-1.5">
                <span className="text-base">{platformIcons.youtube}</span> YouTube Channel ID
              </label>
              <input value={socialConfig.youtubeChannelId} onChange={(e) => setSocialConfig({ ...socialConfig, youtubeChannelId: e.target.value })} placeholder="UC..." className="w-full bg-base border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-accent focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block flex items-center gap-1.5">
                <span className="text-base">{platformIcons.facebook}</span> Facebook Page ID
              </label>
              <input value={socialConfig.facebookPageId} onChange={(e) => setSocialConfig({ ...socialConfig, facebookPageId: e.target.value })} placeholder="Page ID or page name" className="w-full bg-base border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-accent focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block flex items-center gap-1.5">
                <span className="text-base">{platformIcons.instagram}</span> Instagram User ID
              </label>
              <input value={socialConfig.instagramUserId} onChange={(e) => setSocialConfig({ ...socialConfig, instagramUserId: e.target.value })} placeholder="Numeric user ID from Instagram Graph API" className="w-full bg-base border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-accent focus:outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-slate-400 mb-1 block flex items-center gap-1.5">
                <span className="text-base">{platformIcons.tiktok}</span> TikTok Username
              </label>
              <input value={socialConfig.tiktokUsername} onChange={(e) => setSocialConfig({ ...socialConfig, tiktokUsername: e.target.value })} placeholder="username (without @)" className="w-full bg-base border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-accent focus:outline-none" />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button onClick={saveConfig} disabled={savingConfig} className="px-6 py-2 bg-accent text-base font-semibold rounded-lg text-sm hover:bg-accent/80 transition-colors disabled:opacity-50">
              {savingConfig ? "Saving..." : "Save & Fetch Stats"}
            </button>
            <button onClick={() => setShowConfig(false)} className="px-4 py-2 text-slate-400 text-sm hover:text-white transition-colors">Cancel</button>
            {configLoaded && !socialConfig.xUsername && !socialConfig.youtubeChannelId && !socialConfig.facebookPageId && !socialConfig.instagramUserId && !socialConfig.tiktokUsername && (
              <span className="text-xs text-warning">No accounts configured yet — enter at least one to see live data</span>
            )}
          </div>
        </div>
      )}

      {/* Campaign Generator Form */}
      {showCampaignForm && (
        <div className="bg-base-card rounded-xl border border-accent/20 p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-1">AI Campaign Generator</h2>
          <p className="text-sm text-slate-400 mb-4">Describe your campaign and Claude AI will generate optimized posts for all 5 platforms.</p>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Campaign Brief</label>
              <textarea value={campaignBrief} onChange={(e) => setCampaignBrief(e.target.value)} placeholder='e.g. "Launch campaign for Mathly targeting parents of primary school kids who struggle with maths"' rows={3} className="w-full bg-base border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-accent focus:outline-none resize-none" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Project</label>
                <select value={campaignProject} onChange={(e) => setCampaignProject(e.target.value)} className="w-full bg-base border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-accent focus:outline-none">
                  <option value="">Select a project...</option>
                  {projects.map((p) => (
                    <option key={String(p._id)} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Target Audience</label>
                <input value={campaignAudience} onChange={(e) => setCampaignAudience(e.target.value)} placeholder="e.g. parents, developers, traders" className="w-full bg-base border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-accent focus:outline-none" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={generateCampaign} disabled={generating || !campaignBrief || !campaignProject} className="px-6 py-2 bg-accent text-base font-semibold rounded-lg text-sm hover:bg-accent/80 transition-colors disabled:opacity-50">
                {generating ? "Generating with AI..." : "Generate Campaign"}
              </button>
              <button onClick={() => setShowCampaignForm(false)} className="px-4 py-2 text-slate-400 text-sm hover:text-white transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-base-card rounded-xl border border-accent/20 p-4 text-center">
          <div className="text-3xl font-bold font-mono text-accent">{totalFollowers.toLocaleString()}</div>
          <div className="text-xs text-slate-400 mt-1">Total Followers</div>
        </div>
        <div className="bg-base-card rounded-xl border border-success/20 p-4 text-center">
          <div className="text-3xl font-bold font-mono text-success">{avgEngagement.toFixed(2)}%</div>
          <div className="text-xs text-slate-400 mt-1">Avg Engagement</div>
        </div>
        <div className="bg-base-card rounded-xl border border-warning/20 p-4 text-center">
          <div className="text-3xl font-bold font-mono text-warning">{campaigns.filter((c) => c.status === "active").length}</div>
          <div className="text-xs text-slate-400 mt-1">Active Campaigns</div>
        </div>
        <div className="bg-base-card rounded-xl border border-danger/20 p-4 text-center">
          <div className="text-3xl font-bold font-mono text-danger">{activeAlerts}</div>
          <div className="text-xs text-slate-400 mt-1">Viral Alerts</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-base-light rounded-lg p-1">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.key ? "bg-accent/10 text-accent" : "text-slate-400 hover:text-white"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-accent font-mono animate-pulse p-8 text-center">Loading growth data...</div>
      ) : (
        <>
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div>
              {/* Platform Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {(["x", "youtube", "facebook", "instagram", "tiktok"] as SocialPlatform[]).map((platform) => {
                  const stat = stats.find((s) => s.platform === platform);
                  return (
                    <div key={platform} className={`rounded-xl border ${platformColors[platform]} p-5`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{platformIcons[platform]}</span>
                          <h3 className="font-semibold text-white text-sm">{platformLabels[platform]}</h3>
                        </div>
                        {stat?.connected ? (
                          <span className="text-xs text-success font-mono">Connected</span>
                        ) : stat?.error && !stat?.error.includes("not configured") && !stat?.error.includes("not set") && !stat?.error.includes("coming soon") ? (
                          <span className="text-xs text-warning font-mono">Not connected</span>
                        ) : stat?.error ? (
                          <button onClick={() => setShowConfig(true)} className="text-xs text-warning hover:text-white transition-colors">
                            Configure →
                          </button>
                        ) : null}
                      </div>
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <div>
                          <div className="text-lg font-bold font-mono text-white">{(stat?.followers || 0).toLocaleString()}</div>
                          <div className="text-xs text-slate-500">Followers</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold font-mono text-white">{stat?.posts || 0}</div>
                          <div className="text-xs text-slate-500">Posts</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold font-mono text-white">{(stat?.engagementRate || 0).toFixed(1)}%</div>
                          <div className="text-xs text-slate-500">Engagement</div>
                        </div>
                      </div>
                      {/* Recent posts preview */}
                      {stat?.recentPosts && stat.recentPosts.length > 0 && (
                        <div className="space-y-2 mt-3 border-t border-slate-800 pt-3">
                          {stat.recentPosts.slice(0, 3).map((post) => (
                            <div key={post.id} className="text-xs">
                              <p className="text-slate-300 line-clamp-1">{post.text}</p>
                              <div className="flex gap-3 mt-0.5 text-slate-500">
                                <span>{post.likes} likes</span>
                                <span>{post.comments} comments</span>
                                {post.views > 0 && <span>{post.views.toLocaleString()} views</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {stat?.error && !stat.recentPosts?.length && (
                        stat.connected ? (
                          <p className="text-xs text-slate-500 mt-2">{stat.error}</p>
                        ) : (
                          <button onClick={() => setShowConfig(true)} className="text-xs text-slate-500 hover:text-accent mt-2 text-left transition-colors">
                            {stat.error}
                          </button>
                        )
                      )}
                    </div>
                  );
                })}
              </div>

              {/* All Recent Posts */}
              <h2 className="text-lg font-semibold text-white mb-4">Recent Posts Across All Platforms</h2>
              <div className="bg-base-card rounded-xl border border-slate-800 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left p-3 text-slate-400 font-medium">Platform</th>
                      <th className="text-left p-3 text-slate-400 font-medium">Post</th>
                      <th className="text-left p-3 text-slate-400 font-medium">Likes</th>
                      <th className="text-left p-3 text-slate-400 font-medium">Comments</th>
                      <th className="text-left p-3 text-slate-400 font-medium">Views</th>
                      <th className="text-left p-3 text-slate-400 font-medium">Engagement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats
                      .flatMap((s) => s.recentPosts || [])
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .slice(0, 20)
                      .map((post) => (
                        <tr key={`${post.platform}-${post.id}`} className="border-b border-slate-800/50 hover:bg-base/50">
                          <td className="p-3">
                            <span className="text-sm">{platformIcons[post.platform]}</span>
                          </td>
                          <td className="p-3 text-white text-xs max-w-[300px] truncate">
                            {post.url ? (
                              <a href={post.url} target="_blank" rel="noopener noreferrer" className="hover:text-accent">{post.text}</a>
                            ) : post.text}
                          </td>
                          <td className="p-3 text-slate-400 font-mono text-xs">{post.likes.toLocaleString()}</td>
                          <td className="p-3 text-slate-400 font-mono text-xs">{post.comments.toLocaleString()}</td>
                          <td className="p-3 text-slate-400 font-mono text-xs">{post.views > 0 ? post.views.toLocaleString() : "—"}</td>
                          <td className="p-3">
                            <span className={`text-xs font-mono ${post.engagementRate > 5 ? "text-success" : post.engagementRate > 2 ? "text-warning" : "text-slate-400"}`}>
                              {post.engagementRate.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    {stats.flatMap((s) => s.recentPosts || []).length === 0 && (
                      <tr><td colSpan={6} className="p-8 text-center text-slate-500">No posts found. Configure your social accounts and refresh.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Campaigns Tab */}
          {activeTab === "campaigns" && (
            <div>
              {campaigns.length === 0 ? (
                <div className="bg-base-card rounded-xl border border-slate-800 p-12 text-center">
                  <p className="text-slate-400 text-lg mb-2">No campaigns yet</p>
                  <p className="text-slate-500 text-sm mb-4">Click &quot;+ New Campaign&quot; to generate AI-powered posts for all platforms.</p>
                  <button onClick={() => setShowCampaignForm(true)} className="px-4 py-2 bg-accent/10 text-accent border border-accent/20 rounded-lg text-sm hover:bg-accent/20 transition-colors font-mono">
                    Create Your First Campaign
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {campaigns.map((campaign) => (
                    <CampaignCard
                      key={String(campaign._id)}
                      campaign={campaign}
                      onPublish={() => publishCampaign(String(campaign._id))}
                      onDelete={() => deleteCampaign(String(campaign._id))}
                      isPublishing={publishing === String(campaign._id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Viral Alerts Tab */}
          {activeTab === "viral" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Viral Trigger Detection</h2>
                <button onClick={scanViral} className="px-4 py-2 bg-danger/10 text-danger border border-danger/20 rounded-lg text-sm hover:bg-danger/20 transition-colors font-mono">
                  Scan for Viral Posts
                </button>
              </div>

              {alerts.filter((a) => a.status !== "dismissed").length === 0 ? (
                <div className="bg-base-card rounded-xl border border-slate-800 p-12 text-center">
                  <p className="text-slate-400 text-lg mb-2">No viral alerts</p>
                  <p className="text-slate-500 text-sm">Posts performing 2.5x above average will trigger alerts automatically.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {alerts.filter((a) => a.status !== "dismissed").map((alert) => (
                    <div key={String(alert._id)} className="bg-base-card rounded-xl border border-warning/20 p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{platformIcons[alert.platform]}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-white">{platformLabels[alert.platform]}</span>
                              <span className="text-xs px-2 py-0.5 bg-warning/10 text-warning rounded-full font-mono">
                                {alert.multiplier.toFixed(1)}x {alert.metric}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">{new Date(alert.detectedAt).toLocaleString()}</p>
                          </div>
                        </div>
                        <button onClick={() => dismissAlert(String(alert._id))} className="text-xs text-slate-500 hover:text-slate-300">Dismiss</button>
                      </div>

                      <p className="text-sm text-slate-300 mb-3 line-clamp-2">{alert.postText}</p>

                      <div className="flex gap-4 text-xs text-slate-400 mb-3 font-mono">
                        <span>Current: <span className="text-warning">{alert.currentValue.toLocaleString()}</span></span>
                        <span>Average: {alert.averageValue.toLocaleString()}</span>
                        <span className="text-warning">{alert.multiplier.toFixed(1)}x above average</span>
                      </div>

                      {alert.suggestedFollowUp ? (
                        <div className="bg-base rounded-lg p-3 border border-success/10">
                          <h4 className="text-xs font-semibold text-success mb-1">AI Suggested Follow-Up</h4>
                          <p className="text-sm text-slate-300">{alert.suggestedFollowUp}</p>
                        </div>
                      ) : (
                        <button onClick={() => generateFollowUp(String(alert._id))} className="px-3 py-1.5 bg-accent/10 text-accent border border-accent/20 rounded-lg text-xs hover:bg-accent/20 transition-colors font-mono">
                          Generate Follow-Up Post
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CampaignCard({
  campaign,
  onPublish,
  onDelete,
  isPublishing,
}: {
  campaign: Campaign;
  onPublish: () => void;
  onDelete: () => void;
  isPublishing: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const statusColors: Record<string, string> = {
    draft: "bg-slate-500/10 text-slate-400",
    scheduled: "bg-warning/10 text-warning",
    active: "bg-success/10 text-success",
    completed: "bg-accent/10 text-accent",
  };

  return (
    <div className="bg-base-card rounded-xl border border-slate-800 p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-white">{campaign.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[campaign.status]}`}>
              {campaign.status}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {campaign.projectName} — {campaign.targetAudience || "General audience"} — {new Date(campaign.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          {campaign.status === "draft" && (
            <button onClick={onPublish} disabled={isPublishing} className="px-3 py-1.5 bg-success/10 text-success border border-success/20 rounded-lg text-xs hover:bg-success/20 transition-colors font-mono disabled:opacity-50">
              {isPublishing ? "Publishing..." : "Publish All"}
            </button>
          )}
          <button onClick={onDelete} className="px-3 py-1.5 text-danger text-xs border border-danger/20 rounded-lg hover:bg-danger/10 transition-colors">
            Delete
          </button>
        </div>
      </div>

      <p className="text-sm text-slate-400 mb-3">{campaign.brief}</p>

      <button onClick={() => setExpanded(!expanded)} className="text-xs text-accent hover:underline mb-2">
        {expanded ? "Hide posts" : `View ${campaign.posts.length} platform posts`}
      </button>

      {expanded && (
        <div className="space-y-3 mt-3">
          {campaign.posts.map((post, i) => (
            <div key={i} className={`rounded-lg border p-4 ${platformColors[post.platform]}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span>{platformIcons[post.platform]}</span>
                  <span className="text-sm font-medium text-white">{platformLabels[post.platform]}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-mono">{post.optimalTime}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    post.status === "published" ? "bg-success/10 text-success" :
                    post.status === "failed" ? "bg-danger/10 text-danger" :
                    "bg-slate-700/50 text-slate-400"
                  }`}>
                    {post.status}
                  </span>
                </div>
              </div>
              <p className="text-sm text-slate-300 whitespace-pre-wrap">{post.content}</p>
              {post.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {post.hashtags.map((tag, j) => (
                    <span key={j} className="text-xs text-accent/70">#{tag}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
