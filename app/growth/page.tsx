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

const platformUrls: Record<SocialPlatform, string> = {
  x: "https://x.com/spiritary",
  youtube: "https://www.youtube.com/@frekin31",
  facebook: "https://www.facebook.com/profile.php?id=61584376583578",
  instagram: "https://www.instagram.com/sfrench71",
  tiktok: "https://www.tiktok.com/@aiglicthed",
};

type TabType = "overview" | "campaigns" | "viral" | "outreach";

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

  // Outreach email form
  const [outreachEmails, setOutreachEmails] = useState<Array<{ _id?: string; companyName: string; industry: string; subject: string; body: string; followUpSubject: string; followUpBody: string; createdAt: string; contactEmail?: string }>>([]);
  const [showOutreachForm, setShowOutreachForm] = useState(false);
  const [outreachCompany, setOutreachCompany] = useState("");
  const [outreachIndustry, setOutreachIndustry] = useState("");
  const [outreachProduct, setOutreachProduct] = useState("");
  const [outreachEmail, setOutreachEmail] = useState("");
  const [outreachTone, setOutreachTone] = useState<"formal" | "casual" | "bold">("casual");
  const [generatingEmail, setGeneratingEmail] = useState(false);
  // Editable email state
  const [editingEmails, setEditingEmails] = useState<Record<string, { subject: string; body: string; followUpSubject: string; followUpBody: string }>>({});
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // TikTok sandbox/production toggle
  const [tiktokMode, setTiktokMode] = useState<"sandbox" | "production">("production");
  const [tiktokLogs, setTiktokLogs] = useState<string[]>([]);
  const [showTiktokLogs, setShowTiktokLogs] = useState(false);

  // TikTok auth status from OAuth callback redirect
  const [tiktokAuthMsg, setTiktokAuthMsg] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const authResult = params.get("tiktok_auth");
    if (authResult === "success") {
      setTiktokAuthMsg({ type: "success", message: "TikTok authorized successfully! Refreshing stats..." });
      window.history.replaceState({}, "", "/growth");
    } else if (authResult === "error") {
      setTiktokAuthMsg({ type: "error", message: params.get("message") || "TikTok authorization failed" });
      window.history.replaceState({}, "", "/growth");
    }
  }, []);

  // Auto-refresh stats after successful TikTok auth
  useEffect(() => {
    if (tiktokAuthMsg?.type === "success") {
      const timer = setTimeout(() => {
        refreshStats();
        setTiktokAuthMsg(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiktokAuthMsg]);

  // Social config — auto-synced from AIGlitch's GitHub repo via API
  const [showConfig, setShowConfig] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncSource, setSyncSource] = useState<string | null>(null);
  const [socialConfig, setSocialConfig] = useState({
    xUsername: "",
    youtubeChannelId: "",
    facebookPageId: "",
    instagramUserId: "",
    tiktokUsername: "",
  });

  // Load saved config on mount — API auto-syncs from AIGlitch if empty
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await fetch("/api/social?action=config");
        if (res.ok) {
          const data = await res.json();
          setSocialConfig({
            xUsername: data.xUsername || "",
            youtubeChannelId: data.youtubeChannelId || "",
            facebookPageId: data.facebookPageId || "",
            instagramUserId: data.instagramUserId || "",
            tiktokUsername: data.tiktokUsername || "",
          });
          if (data.syncedFrom) setSyncSource(data.syncedFrom);
          const hasAnyConfig = data.xUsername || data.youtubeChannelId || data.facebookPageId || data.instagramUserId || data.tiktokUsername;
          if (!hasAnyConfig) setShowConfig(true);
        }
      } catch {
        // silently fail
      }
      setConfigLoaded(true);
    };
    loadConfig();
  }, []);

  const syncFromProject = async (repo?: string) => {
    setSyncing(true);
    try {
      const res = await fetch("/api/social?action=sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: repo || "comfybear71/aiglitch" }),
      });
      if (res.ok) {
        const data = await res.json();
        const c = data.config;
        setSocialConfig({
          xUsername: c.xUsername || "",
          youtubeChannelId: c.youtubeChannelId || "",
          facebookPageId: c.facebookPageId || "",
          instagramUserId: c.instagramUserId || "",
          tiktokUsername: c.tiktokUsername || "",
        });
        setSyncSource(c.syncedFrom || null);
      }
    } catch {
      // silently fail
    }
    setSyncing(false);
  };

  const fetchAll = useCallback(async () => {
    const [statsRes, campaignsRes, alertsRes, projectsRes, outreachRes] = await Promise.allSettled([
      fetch("/api/social?action=stats"),
      fetch("/api/campaigns"),
      fetch("/api/viral"),
      fetch("/api/projects"),
      fetch("/api/outreach"),
    ]);

    if (statsRes.status === "fulfilled" && statsRes.value.ok) {
      const data = await statsRes.value.json();
      const statsArr = Array.isArray(data) ? data : [];
      setStats(statsArr);
      // Extract TikTok monitoring logs and mode
      const tiktokStat = statsArr.find((s: SocialStats) => s.platform === "tiktok");
      if (tiktokStat?.logs) setTiktokLogs(tiktokStat.logs);
      if (tiktokStat?.mode) setTiktokMode(tiktokStat.mode);
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
    if (outreachRes.status === "fulfilled" && outreachRes.value.ok) {
      const emailData = await outreachRes.value.json();
      setOutreachEmails(Array.isArray(emailData) ? emailData : []);
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

  const generateOutreachEmail = async () => {
    setGeneratingEmail(true);
    try {
      const res = await fetch("/api/outreach?action=generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: outreachCompany,
          industry: outreachIndustry,
          productDescription: outreachProduct,
          tone: outreachTone,
          contactEmail: outreachEmail,
        }),
      });
      if (res.ok) {
        await fetchAll();
        setShowOutreachForm(false);
        setOutreachCompany("");
        setOutreachIndustry("");
        setOutreachProduct("");
        setOutreachEmail("");
        setActiveTab("outreach");
      }
    } catch {
      // silently fail
    }
    setGeneratingEmail(false);
  };

  const deleteOutreachEmail = async (emailId: string) => {
    await fetch("/api/outreach?action=delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailId }),
    });
    fetchAll();
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedEmail(id);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const getEditableEmail = (email: typeof outreachEmails[0]) => {
    const id = String(email._id);
    return editingEmails[id] || { subject: email.subject, body: email.body, followUpSubject: email.followUpSubject, followUpBody: email.followUpBody };
  };

  const updateEditableEmail = (id: string, field: string, value: string) => {
    setEditingEmails((prev) => ({
      ...prev,
      [id]: { ...getEditableEmail(outreachEmails.find(e => String(e._id) === id)!), [field]: value },
    }));
  };

  const openMailto = (toEmail: string, subject: string, body: string) => {
    const mailto = `mailto:${encodeURIComponent(toEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailto, "_blank");
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
    { key: "outreach", label: `Outreach (${outreachEmails.length})` },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Growth Engine</h1>
          <p className="text-sm text-slate-500 mt-1">
            Social media, campaigns, and viral detection — Last: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button onClick={() => setShowConfig(!showConfig)} className="px-3 sm:px-4 py-2 bg-slate-700/50 text-slate-300 border border-slate-600 rounded-lg text-xs sm:text-sm hover:bg-slate-700 transition-colors font-mono">
            Configure
          </button>
          <button onClick={() => setShowCampaignForm(!showCampaignForm)} className="px-3 sm:px-4 py-2 bg-accent/10 text-accent border border-accent/20 rounded-lg text-xs sm:text-sm hover:bg-accent/20 transition-colors font-mono">
            + Campaign
          </button>
          <button onClick={refreshStats} className="px-3 sm:px-4 py-2 bg-success/10 text-success border border-success/20 rounded-lg text-xs sm:text-sm hover:bg-success/20 transition-colors font-mono">
            Refresh
          </button>
        </div>
      </div>

      {/* TikTok Auth Status */}
      {tiktokAuthMsg && (
        <div className={`rounded-lg border p-3 mb-4 text-sm font-mono ${
          tiktokAuthMsg.type === "success"
            ? "bg-success/10 border-success/20 text-success"
            : "bg-danger/10 border-danger/20 text-danger"
        }`}>
          {tiktokAuthMsg.message}
          <button onClick={() => setTiktokAuthMsg(null)} className="ml-3 text-xs opacity-60 hover:opacity-100">dismiss</button>
        </div>
      )}

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
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <button onClick={saveConfig} disabled={savingConfig} className="px-6 py-2 bg-accent text-base font-semibold rounded-lg text-sm hover:bg-accent/80 transition-colors disabled:opacity-50">
              {savingConfig ? "Saving..." : "Save & Fetch Stats"}
            </button>
            <button onClick={() => syncFromProject()} disabled={syncing} className="px-4 py-2 bg-warning/10 text-warning border border-warning/20 rounded-lg text-sm hover:bg-warning/20 transition-colors disabled:opacity-50 font-mono">
              {syncing ? "Syncing..." : "Sync from AIGlitch"}
            </button>
            <button onClick={() => setShowConfig(false)} className="px-4 py-2 text-slate-400 text-sm hover:text-white transition-colors">Cancel</button>
            {syncSource && (
              <span className="text-xs text-success">Synced from {syncSource}</span>
            )}
            {configLoaded && !syncSource && !socialConfig.xUsername && !socialConfig.youtubeChannelId && !socialConfig.facebookPageId && !socialConfig.instagramUserId && !socialConfig.tiktokUsername && (
              <span className="text-xs text-warning">No accounts configured — click &quot;Sync from AIGlitch&quot; to auto-fill</span>
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
                          <a href={platformUrls[platform]} target="_blank" rel="noopener noreferrer" className="text-xl hover:opacity-70 transition-opacity">{platformIcons[platform]}</a>
                          <a href={platformUrls[platform]} target="_blank" rel="noopener noreferrer" className="font-semibold text-white text-sm hover:text-accent transition-colors">{platformLabels[platform]}</a>
                        </div>
                        <div className="flex items-center gap-2">
                          {platform === "tiktok" && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400">
                              MANUAL
                            </span>
                          )}
                          {stat?.error === "quota_exceeded" ? (
                            <span className="text-xs text-amber-400 font-mono">Quota Limit</span>
                          ) : stat?.connected ? (
                            <span className="text-xs text-success font-mono">Connected</span>
                          ) : stat?.error?.includes("coming soon") ? (
                            <span className="text-xs text-slate-500 font-mono">Coming soon</span>
                          ) : stat?.error?.includes("sandboxed") ? (
                            <span className="text-xs text-slate-500 font-mono">Sandboxed</span>
                          ) : stat?.error?.includes("Authorize TikTok") ? (
                            <a href="/api/auth/tiktok" className="text-xs text-accent font-mono hover:underline">Authorize TikTok</a>
                          ) : stat?.error ? (
                            <span className="text-xs text-error font-mono">Error</span>
                          ) : null}
                        </div>
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
                      {stat?.error === "quota_exceeded" && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 bg-amber-500/10 rounded-full h-1.5">
                            <div className="bg-amber-400 h-1.5 rounded-full w-full" />
                          </div>
                          <span className="text-[10px] text-amber-400 font-mono whitespace-nowrap">100% used</span>
                        </div>
                      )}
                      {stat?.error === "quota_exceeded" && (stat?.followers || 0) > 0 && (
                        <p className="text-[10px] text-slate-600 mt-1">Showing cached data — resets midnight PT</p>
                      )}
                      {stat?.error && stat.error !== "quota_exceeded" && !stat.recentPosts?.length && (
                        <div className="mt-2">
                          <p className="text-xs text-slate-500">{stat.error}</p>
                        </div>
                      )}
                      {/* TikTok-specific controls */}
                      {platform === "tiktok" && (
                        <div className="mt-3 border-t border-slate-800 pt-3 space-y-2">
                          {/* TikTok Ad Performance Metrics */}
                          {(stat as Record<string, unknown>)?.adCost && (
                            <div className="grid grid-cols-2 gap-2 mb-2">
                              <div className="bg-base rounded-lg p-2 border border-slate-800">
                                <div className="text-xs text-slate-500">Ad Cost</div>
                                <div className="text-sm font-bold font-mono text-white">{(stat as Record<string, unknown>).adCost as string}</div>
                              </div>
                              <div className="bg-base rounded-lg p-2 border border-slate-800">
                                <div className="text-xs text-slate-500">Video Views</div>
                                <div className="text-sm font-bold font-mono text-white">{(stat as Record<string, unknown>).videoViews as string}</div>
                              </div>
                              <div className="bg-base rounded-lg p-2 border border-slate-800">
                                <div className="text-xs text-slate-500">New Followers</div>
                                <div className="text-sm font-bold font-mono text-white">{((stat as Record<string, unknown>).newFollowers as number || 0).toLocaleString()}</div>
                              </div>
                              <div className="bg-base rounded-lg p-2 border border-slate-800">
                                <div className="text-xs text-slate-500">Profile Views</div>
                                <div className="text-sm font-bold font-mono text-white">{((stat as Record<string, unknown>).profileViews as number || 0).toLocaleString()}</div>
                              </div>
                            </div>
                          )}
                          {(stat as Record<string, unknown>)?.mode === "manual" && (
                            <div className="text-[10px] font-mono text-amber-400 mb-1">Manual stats — TikTok API not available</div>
                          )}
                          {/* TikTok API blocked — manual mode only */}
                          <div className="text-[10px] font-mono text-slate-500">
                            TikTok API access denied — stats entered manually. Videos uploaded via TikTok Blaster on AIG!itch admin.
                          </div>
                          {/* Monitoring Log Toggle */}
                          <button
                            onClick={() => setShowTiktokLogs(!showTiktokLogs)}
                            className="text-[10px] font-mono text-slate-500 hover:text-slate-300 transition-colors"
                          >
                            {showTiktokLogs ? "Hide" : "Show"} API Log ({tiktokLogs.length} entries)
                          </button>
                          {showTiktokLogs && tiktokLogs.length > 0 && (
                            <div className="bg-black/40 rounded-lg p-2 max-h-40 overflow-y-auto border border-slate-800">
                              {tiktokLogs.map((log, i) => (
                                <div key={i} className={`text-[10px] font-mono leading-relaxed ${
                                  log.includes("ERROR") || log.includes("FAILED") ? "text-red-400" :
                                  log.includes("OK") || log.includes("success") || log.includes("Done") ? "text-green-400" :
                                  log.includes("Mode:") ? "text-amber-400" :
                                  "text-slate-400"
                                }`}>
                                  {log}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* All Recent Posts */}
              <h2 className="text-lg font-semibold text-white mb-4">Recent Posts Across All Platforms</h2>
              <div className="bg-base-card rounded-xl border border-slate-800 overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
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

          {/* Outreach Tab */}
          {activeTab === "outreach" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">Sponsor Outreach</h2>
                  <p className="text-xs text-slate-500 mt-1">AI-generated pitch emails for potential advertisers</p>
                </div>
                <button onClick={() => setShowOutreachForm(!showOutreachForm)} className="px-4 py-2 bg-accent/10 text-accent border border-accent/20 rounded-lg text-sm hover:bg-accent/20 transition-colors font-mono">
                  + New Email
                </button>
              </div>

              {/* Email Generation Form */}
              {showOutreachForm && (
                <div className="bg-base-card rounded-xl border border-accent/20 p-6 mb-6">
                  <h3 className="text-sm font-semibold text-white mb-4">Generate Sponsor Pitch Email</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Company Name *</label>
                      <input value={outreachCompany} onChange={(e) => setOutreachCompany(e.target.value)} placeholder="e.g. Acme AI Tools" className="w-full bg-base border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-accent focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Industry *</label>
                      <input value={outreachIndustry} onChange={(e) => setOutreachIndustry(e.target.value)} placeholder="e.g. AI/Tech, Gaming, Crypto" className="w-full bg-base border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-accent focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Contact Email</label>
                      <input value={outreachEmail} onChange={(e) => setOutreachEmail(e.target.value)} placeholder="e.g. partnerships@company.com" className="w-full bg-base border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-accent focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">What they sell / product</label>
                      <input value={outreachProduct} onChange={(e) => setOutreachProduct(e.target.value)} placeholder="e.g. Energy drinks, Gaming gear" className="w-full bg-base border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-accent focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Tone</label>
                      <div className="flex gap-2">
                        {(["casual", "formal", "bold"] as const).map((t) => (
                          <button key={t} onClick={() => setOutreachTone(t)} className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${outreachTone === t ? "bg-accent/20 text-accent border border-accent/30" : "bg-slate-800 text-slate-400 border border-slate-700 hover:text-white"}`}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={generateOutreachEmail} disabled={generatingEmail || !outreachCompany || !outreachIndustry} className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-mono disabled:opacity-50 hover:bg-accent/80 transition-colors">
                      {generatingEmail ? "Generating..." : "Generate Email"}
                    </button>
                    <button onClick={() => setShowOutreachForm(false)} className="px-4 py-2 text-slate-400 text-sm hover:text-white transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Email List */}
              {outreachEmails.length === 0 && !showOutreachForm ? (
                <div className="bg-base-card rounded-xl border border-slate-800 p-12 text-center">
                  <p className="text-slate-400 text-lg mb-2">No outreach emails yet</p>
                  <p className="text-slate-500 text-sm mb-4">Generate AI-powered pitch emails for potential sponsors and advertisers.</p>
                  <button onClick={() => setShowOutreachForm(true)} className="px-4 py-2 bg-accent/10 text-accent border border-accent/20 rounded-lg text-sm hover:bg-accent/20 transition-colors font-mono">
                    Generate Your First Email
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {outreachEmails.map((email) => {
                    const id = String(email._id);
                    const editable = getEditableEmail(email);
                    const prospectEmail = email.contactEmail || "";
                    return (
                    <div key={id} className="bg-base-card rounded-xl border border-slate-800 p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-white text-sm">{email.companyName}</h3>
                          <p className="text-xs text-slate-500">{email.industry} — {new Date(email.createdAt).toLocaleDateString()}</p>
                        </div>
                        <button onClick={() => deleteOutreachEmail(id)} className="text-xs text-danger hover:text-danger/80">Delete</button>
                      </div>

                      {/* Initial Email — Editable */}
                      <div className="bg-base rounded-lg border border-slate-800 p-4 mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-semibold text-accent">Initial Email</h4>
                          <div className="flex gap-1">
                            <button onClick={() => copyToClipboard(`Subject: ${editable.subject}\n\n${editable.body}`, `initial-${id}`)} className={`text-[10px] font-mono px-2 py-1 rounded transition-colors ${copiedEmail === `initial-${id}` ? "bg-success/20 text-success" : "bg-slate-800 text-slate-400 hover:text-white"}`}>
                              {copiedEmail === `initial-${id}` ? "Copied!" : "Copy"}
                            </button>
                            <button onClick={() => openMailto(prospectEmail || "advertise@aiglitch.app", editable.subject, editable.body)} className="text-[10px] font-mono px-2 py-1 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30">
                              Send
                            </button>
                          </div>
                        </div>
                        <div className="mb-2">
                          <span className="text-[10px] text-slate-500">Subject:</span>
                          <input value={editable.subject} onChange={(e) => updateEditableEmail(id, "subject", e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 rounded px-2 py-1 text-xs text-white mt-1 focus:border-accent focus:outline-none" />
                        </div>
                        <textarea value={editable.body} onChange={(e) => updateEditableEmail(id, "body", e.target.value)} rows={10} className="w-full bg-slate-900/50 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-300 leading-relaxed focus:border-accent focus:outline-none resize-y" />
                      </div>

                      {/* Follow-up Email — Editable */}
                      <div className="bg-base rounded-lg border border-slate-800 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-semibold text-amber-400">Follow-Up (5 days later)</h4>
                          <div className="flex gap-1">
                            <button onClick={() => copyToClipboard(`Subject: ${editable.followUpSubject}\n\n${editable.followUpBody}`, `followup-${id}`)} className={`text-[10px] font-mono px-2 py-1 rounded transition-colors ${copiedEmail === `followup-${id}` ? "bg-success/20 text-success" : "bg-slate-800 text-slate-400 hover:text-white"}`}>
                              {copiedEmail === `followup-${id}` ? "Copied!" : "Copy"}
                            </button>
                            <button onClick={() => openMailto(prospectEmail || "advertise@aiglitch.app", editable.followUpSubject, editable.followUpBody)} className="text-[10px] font-mono px-2 py-1 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30">
                              Send
                            </button>
                          </div>
                        </div>
                        <div className="mb-2">
                          <span className="text-[10px] text-slate-500">Subject:</span>
                          <input value={editable.followUpSubject} onChange={(e) => updateEditableEmail(id, "followUpSubject", e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 rounded px-2 py-1 text-xs text-white mt-1 focus:border-accent focus:outline-none" />
                        </div>
                        <textarea value={editable.followUpBody} onChange={(e) => updateEditableEmail(id, "followUpBody", e.target.value)} rows={4} className="w-full bg-slate-900/50 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-300 leading-relaxed focus:border-accent focus:outline-none resize-y" />
                      </div>
                    </div>
                    );
                  })}
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
