"use client";

import { useState, useEffect, useCallback } from "react";

interface ServiceCost {
  name: string;
  key: string;
  cost: number | null;
  error: string | null;
  loading: boolean;
  lastFetched: string | null;
  type: "live" | "fixed";
  apiRoute?: string;
}

interface Invoice {
  date: string;
  amount: number;
  type: string;
  status: string;
}

interface Strategy {
  title: string;
  service: string;
  currentCost: string;
  targetCost: string;
  savings: string;
  effort: "Easy" | "Medium" | "Hard";
  priority: number;
  description: string;
  steps: string[];
}

const STRATEGIES: Strategy[] = [
  {
    title: "Use Sonnet as default Claude Code model",
    service: "Anthropic",
    currentCost: "~$1,280/mo",
    targetCost: "~$250-400/mo",
    savings: "$800-1,000/mo",
    effort: "Easy",
    priority: 1,
    description:
      "Most of the $1,281 Anthropic bill is from Claude Code sessions (coding on all projects — TheMaster, AIGlitch, Glitch App, etc). Opus is ~5x more expensive than Sonnet. Sonnet handles 90% of coding tasks equally well. Use /model in Claude Code to switch. This applies across ALL your projects.",
    steps: [
      "Start every Claude Code session with: /model claude-sonnet-4-6 (5x cheaper than Opus)",
      "Only switch to Opus (/model claude-opus-4-6) for complex architecture or hard debugging",
      "Use Haiku (/model claude-haiku-4-5-20251001) for simple tasks: commits, file edits, HANDOFF updates",
      "TheMaster website API already switched to Haiku (lib/ai.ts) — Sonnet only for error analysis",
    ],
  },
  {
    title: "✅ Downgraded Claude Max → Pro (DONE)",
    service: "Claude Pro",
    currentCost: "$100/mo → $19/mo",
    targetCost: "$19/mo",
    savings: "$81/mo saved",
    effort: "Easy",
    priority: 2,
    description:
      "Downgraded from Claude Max (A$169.99/mo) to Claude Pro (A$29/mo) on 2026-03-30. Claude Code uses API credits, not the subscription — so Pro gives the same coding experience at 83% less.",
    steps: [
      "✅ Downgraded to Pro at claude.ai — done 2026-03-30",
      "Monitor: If you need Max features later (20x chat usage, priority access), you can upgrade back",
    ],
  },
  {
    title: "Optimize AIGlitch Grok cron jobs",
    service: "xAI (Grok)",
    currentCost: "$215/mo",
    targetCost: "$50-100/mo",
    savings: "$115-165/mo",
    effort: "Medium",
    priority: 3,
    description:
      "AIGlitch runs 18 cron jobs generating content via Grok. Switching to grok-3-fast, reducing frequencies, and enabling prompt caching can cut costs 50-75%. Full optimization guide exists in docs/aiglitch-cost-optimization.md.",
    steps: [
      "Switch to grok-3-fast for 80% of content generation (routine posts, topics)",
      "Halve cron frequencies in AIGlitch vercel.json (e.g. every 15min → 30min)",
      "Add x-grok-conv-id headers for prompt caching (stable IDs per task type)",
      "Set max_tokens limits: posts 300, topics 500, screenplays 2000",
      "Enable Data Sharing on console.x.ai for $150/mo credit",
    ],
  },
  {
    title: "✅ X API is pay-per-use (already cheap)",
    service: "X (Twitter)",
    currentCost: "~$10-15/mo",
    targetCost: "~$10-15/mo",
    savings: "$35/mo corrected",
    effort: "Easy",
    priority: 4,
    description:
      "X Developer API is already on pay-per-use plan, not the $50/mo fixed plan we assumed. Actual usage is well under $1/day (~$10-15/mo). $78.91 credits remaining. X Premium subscription (@spiritary verified badge) is separate — check that cost too.",
    steps: [
      "✅ Confirmed: pay-per-use plan at console.x.com — no action needed",
      "Check X Premium subscription cost at x.com → Premium → Manage subscription",
      "Consider: Do you need the verified badge? If not, cancel X Premium too",
    ],
  },
  {
    title: "Consolidate Vercel projects",
    service: "Vercel",
    currentCost: "$38/mo",
    targetCost: "$20/mo",
    savings: "$18/mo",
    effort: "Hard",
    priority: 5,
    description:
      "Vercel Pro is $20/mo base + on-demand usage. The $38 means ~$18 in overages (serverless function execution, bandwidth). Reducing unnecessary API polling and optimizing serverless function duration can cut overages.",
    steps: [
      "Audit which projects are consuming the most serverless function hours",
      "Increase polling intervals on TheMaster dashboard (60s → 120s or 300s)",
      "Add stale-while-revalidate caching to API routes that don't need real-time data",
      "Consider moving low-traffic projects to Vercel Hobby (free) if they don't need Pro features",
    ],
  },
  {
    title: "Use prompt caching in TheMaster API calls",
    service: "Anthropic",
    currentCost: "Included above",
    targetCost: "30-50% less per call",
    savings: "$50-100/mo",
    effort: "Medium",
    priority: 6,
    description:
      "Anthropic supports prompt caching — repeated system prompts are charged at 90% discount on cache hits. TheMaster's system prompts in lib/ai.ts are static and identical across calls, perfect for caching.",
    steps: [
      "Add 'anthropic-beta: prompt-caching-2024-07-31' header to API calls in lib/ai.ts",
      "Mark system prompts with cache_control: { type: 'ephemeral' } in the messages array",
      "Restructure prompts: static instructions FIRST, dynamic content LAST",
      "Monitor cache hit rates via Anthropic dashboard",
    ],
  },
];

const EFFORT_COLORS: Record<string, string> = {
  Easy: "text-success border-success/20 bg-success/10",
  Medium: "text-warning border-warning/20 bg-warning/10",
  Hard: "text-error border-error/20 bg-error/10",
};

const FIXED_SERVICES: { name: string; key: string; cost: number }[] = [
  { name: "ImprovMX", key: "improvmx", cost: 9.0 },
  { name: "Resend", key: "resend", cost: 0.0 },
  { name: "X (Twitter)", key: "twitter", cost: 15.0 },
  { name: "Claude Pro", key: "claudepro", cost: 19.0 },
];

const LIVE_SERVICES: { name: string; key: string; apiRoute: string }[] = [
  { name: "DigitalOcean", key: "digitalocean", apiRoute: "/api/costs/digitalocean" },
  { name: "Vercel", key: "vercel", apiRoute: "/api/costs/vercel" },
  { name: "Anthropic (Claude)", key: "anthropic", apiRoute: "/api/costs/anthropic" },
  { name: "xAI (Grok)", key: "xai", apiRoute: "/api/costs/xai" },
  { name: "MongoDB Atlas", key: "mongodb", apiRoute: "/api/costs/mongodb" },
];

const SERVICE_ICONS: Record<string, string> = {
  digitalocean: "\u{1F4A7}",
  vercel: "\u25B2",
  anthropic: "\u{1F9E0}",
  xai: "\u26A1",
  mongodb: "\u{1F343}",
  improvmx: "\u2709",
  resend: "\u{1F4E8}",
  twitter: "\u{1D54F}",
  claudepro: "\u2728",
};

export default function CostsPage() {
  const [services, setServices] = useState<ServiceCost[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [invoices, setInvoices] = useState<Record<string, Invoice[]>>({});
  const [expandedInvoices, setExpandedInvoices] = useState<string | null>(null);

  // Initialize services and load saved overrides from MongoDB
  useEffect(() => {
    const init = async () => {
      let savedCosts: Record<string, number> = {};
      try {
        const res = await fetch("/api/costs/settings");
        savedCosts = await res.json();
      } catch {
        // Use defaults
      }

      // Load invoice histories
      try {
        const invRes = await fetch("/api/costs/invoices");
        const invData = await invRes.json();
        setInvoices(invData);
      } catch {
        // No invoices yet
      }

      const initial: ServiceCost[] = [
        ...LIVE_SERVICES.map((s) => ({
          name: s.name,
          key: s.key,
          // If user has manually saved a cost for this service, use it
          cost: savedCosts[s.key] ?? null,
          error: null,
          loading: !(s.key in savedCosts),
          lastFetched: null,
          type: "live" as const,
          apiRoute: s.apiRoute,
        })),
        ...FIXED_SERVICES.map((s) => ({
          name: s.name,
          key: s.key,
          cost: savedCosts[s.key] ?? s.cost,
          error: null,
          loading: false,
          lastFetched: null,
          type: "fixed" as const,
        })),
      ];
      setServices(initial);
    };
    init();
  }, []);

  const fetchService = useCallback(async (key: string, apiRoute: string) => {
    setServices((prev) =>
      prev.map((s) => (s.key === key ? { ...s, loading: true, error: null } : s))
    );

    try {
      const res = await fetch(apiRoute, { cache: "no-store" });
      const data = await res.json();

      if (data.error) {
        setServices((prev) =>
          prev.map((s) =>
            s.key === key
              ? { ...s, loading: false, error: data.error }
              : s
          )
        );
      } else {
        setServices((prev) =>
          prev.map((s) =>
            s.key === key
              ? { ...s, loading: false, error: null, cost: data.cost, lastFetched: data.lastFetched }
              : s
          )
        );
      }
    } catch {
      setServices((prev) =>
        prev.map((s) =>
          s.key === key ? { ...s, loading: false, error: "Network error" } : s
        )
      );
    }
  }, []);

  // Fetch all live services on mount
  useEffect(() => {
    if (services.length === 0) return;
    services
      .filter((s) => s.type === "live" && s.apiRoute && s.loading)
      .forEach((s) => {
        if (s.apiRoute) fetchService(s.key, s.apiRoute);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services.length > 0]);

  const refreshAll = () => {
    services
      .filter((s) => s.type === "live" && s.apiRoute)
      .forEach((s) => {
        if (s.apiRoute) fetchService(s.key, s.apiRoute);
      });
  };

  // Save a manually entered cost to MongoDB
  const handleEditSave = async (key: string) => {
    const val = parseFloat(editValue);
    if (!isNaN(val) && val >= 0) {
      setServices((prev) =>
        prev.map((s) => (s.key === key ? { ...s, cost: val, error: null } : s))
      );
      try {
        await fetch("/api/costs/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ service: key, cost: val }),
        });
      } catch {
        // Optimistic update already applied
      }
    }
    setEditingKey(null);
    setEditValue("");
  };

  // Calculate totals
  const liveServices = services.filter((s) => s.type === "live");
  const fixedServices = services.filter((s) => s.type === "fixed");
  const liveTotal = liveServices.reduce((sum, s) => sum + (s.cost ?? 0), 0);
  const fixedTotal = fixedServices.reduce((sum, s) => sum + (s.cost ?? 0), 0);
  const grandTotal = liveTotal + fixedTotal;
  const anyLoading = services.some((s) => s.loading);

  const [showStrategies, setShowStrategies] = useState(false);
  const [expandedStrategy, setExpandedStrategy] = useState<number | null>(null);

  const totalPotentialSavings = STRATEGIES.reduce((sum, s) => {
    const match = s.savings.match(/\$(\d[\d,]*)/);
    return sum + (match ? parseInt(match[1].replace(",", "")) : 0);
  }, 0);

  const now = new Date();
  const monthYear = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Monthly Costs</h1>
          <p className="text-sm text-slate-500 mt-1">{monthYear}</p>
        </div>
        <button
          onClick={refreshAll}
          disabled={anyLoading}
          className="px-4 py-2 bg-accent/10 text-accent border border-accent/20 rounded-lg text-sm hover:bg-accent/20 transition-colors font-mono disabled:opacity-50"
        >
          {anyLoading ? "Refreshing..." : "Refresh All"}
        </button>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-base-card rounded-xl border border-slate-800 p-5">
          <p className="text-xs text-slate-500 font-mono uppercase tracking-wider">Total</p>
          <p className="text-3xl font-bold text-white mt-1">
            ${grandTotal.toFixed(2)}
          </p>
        </div>
        <div className="bg-base-card rounded-xl border border-slate-800 p-5">
          <p className="text-xs text-slate-500 font-mono uppercase tracking-wider">Live Services</p>
          <p className="text-2xl font-bold text-accent mt-1">
            ${liveTotal.toFixed(2)}
          </p>
        </div>
        <div className="bg-base-card rounded-xl border border-slate-800 p-5">
          <p className="text-xs text-slate-500 font-mono uppercase tracking-wider">Fixed Monthly</p>
          <p className="text-2xl font-bold text-slate-300 mt-1">
            ${fixedTotal.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Service Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service) => (
          <div
            key={service.key}
            className="bg-base-card rounded-xl border border-slate-800 p-5 flex flex-col justify-between min-h-[140px]"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">{SERVICE_ICONS[service.key] || "\u25CB"}</span>
                <h3 className="text-sm font-bold text-white">{service.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                    service.type === "live"
                      ? "bg-success/10 text-success border border-success/20"
                      : "bg-slate-700/50 text-slate-400 border border-slate-600/30"
                  }`}
                >
                  {service.type === "live" ? "Live" : "Fixed"}
                </span>
                {service.type === "live" && service.apiRoute && (
                  <button
                    onClick={() => fetchService(service.key, service.apiRoute!)}
                    disabled={service.loading}
                    className="text-slate-500 hover:text-accent transition-colors disabled:opacity-30"
                    title="Refresh"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={service.loading ? "animate-spin" : ""}
                    >
                      <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Cost Display */}
            <div className="mt-auto">
              {service.loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                  <span className="text-sm text-slate-500 font-mono">Loading...</span>
                </div>
              ) : editingKey === service.key ? (
                <div className="flex items-center gap-2">
                  <span className="text-lg text-white">$</span>
                  <input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleEditSave(service.key);
                      if (e.key === "Escape") setEditingKey(null);
                    }}
                    autoFocus
                    className="w-24 bg-base border border-slate-700 rounded px-2 py-1 text-lg text-white font-mono focus:border-accent focus:outline-none"
                  />
                  <button
                    onClick={() => handleEditSave(service.key)}
                    className="text-xs text-success font-mono hover:underline"
                  >
                    Save
                  </button>
                </div>
              ) : service.error && service.cost === null ? (
                /* API failed and no saved cost — show error + Enter button */
                <div>
                  <p className="text-[10px] text-warning font-mono mb-2 break-words">
                    {service.error}
                  </p>
                  <button
                    onClick={() => {
                      setEditingKey(service.key);
                      setEditValue("");
                    }}
                    className="text-xs text-accent font-mono hover:underline"
                  >
                    Enter cost manually
                  </button>
                </div>
              ) : (
                /* Show cost (from API or manual entry) */
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-2xl font-bold text-white font-mono">
                      ${(service.cost ?? 0).toFixed(2)}
                    </p>
                    <button
                      onClick={() => {
                        setEditingKey(service.key);
                        setEditValue((service.cost ?? 0).toString());
                      }}
                      className="text-xs text-slate-500 hover:text-accent font-mono transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                  {service.error && (
                    <p className="text-[10px] text-warning font-mono mt-1 break-words">
                      API: {service.error}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Last Fetched */}
            {service.lastFetched && !service.loading && (
              <p className="text-[10px] text-slate-600 font-mono mt-2">
                {new Date(service.lastFetched).toLocaleTimeString()}
              </p>
            )}

            {/* Invoice History Dropdown */}
            {invoices[service.key] && invoices[service.key].length > 0 && (
              <div className="mt-3 border-t border-slate-800 pt-2">
                <button
                  onClick={() => setExpandedInvoices(expandedInvoices === service.key ? null : service.key)}
                  className="flex items-center justify-between w-full text-[10px] text-slate-500 hover:text-accent font-mono transition-colors"
                >
                  <span>{invoices[service.key].length} invoices</span>
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`transition-transform ${expandedInvoices === service.key ? "rotate-180" : ""}`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {expandedInvoices === service.key && (
                  <div className="mt-2 max-h-48 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                    <div className="flex items-center justify-between text-[9px] text-slate-600 font-mono uppercase tracking-wider pb-1 border-b border-slate-800/50">
                      <span>Date</span>
                      <span>Amount</span>
                    </div>
                    {invoices[service.key].map((inv, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-[11px] font-mono py-0.5"
                      >
                        <span className="text-slate-500">{inv.date}</span>
                        <span className={inv.amount === 0 ? "text-slate-600" : "text-slate-300"}>
                          ${inv.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between text-[11px] font-mono pt-1 border-t border-slate-700 mt-1">
                      <span className="text-slate-400 font-bold">Total</span>
                      <span className="text-accent font-bold">
                        ${invoices[service.key].reduce((sum, inv) => sum + inv.amount, 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Cost Saving Strategies */}
      <div className="mt-10">
        <button
          onClick={() => setShowStrategies(!showStrategies)}
          className="w-full flex items-center justify-between bg-base-card rounded-xl border border-slate-800 p-5 hover:border-accent/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">💡</span>
            <div className="text-left">
              <h2 className="text-lg font-bold text-white">Cost Saving Strategies</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {STRATEGIES.length} strategies — potential savings up to ${totalPotentialSavings.toLocaleString()}+/mo
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono text-accent bg-accent/10 px-3 py-1 rounded-full border border-accent/20">
              Target: ~$400/mo
            </span>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`text-slate-500 transition-transform ${showStrategies ? "rotate-180" : ""}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </button>

        {showStrategies && (
          <div className="mt-4 space-y-3">
            {/* Summary bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-base-card rounded-xl border border-slate-800 p-4">
                <p className="text-xs text-slate-500 font-mono uppercase tracking-wider">Current Monthly</p>
                <p className="text-2xl font-bold text-error mt-1">${grandTotal.toFixed(2)}</p>
              </div>
              <div className="bg-base-card rounded-xl border border-slate-800 p-4">
                <p className="text-xs text-slate-500 font-mono uppercase tracking-wider">Target Monthly</p>
                <p className="text-2xl font-bold text-success mt-1">~$400</p>
              </div>
              <div className="bg-base-card rounded-xl border border-slate-800 p-4">
                <p className="text-xs text-slate-500 font-mono uppercase tracking-wider">Potential Savings</p>
                <p className="text-2xl font-bold text-accent mt-1">${totalPotentialSavings.toLocaleString()}+/mo</p>
              </div>
            </div>

            {/* Strategy cards */}
            {STRATEGIES.sort((a, b) => a.priority - b.priority).map((strategy, idx) => (
              <div
                key={idx}
                className="bg-base-card rounded-xl border border-slate-800 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedStrategy(expandedStrategy === idx ? null : idx)}
                  className="w-full p-5 flex items-start justify-between text-left hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs font-mono text-slate-600">#{strategy.priority}</span>
                      <h3 className="text-sm font-bold text-white">{strategy.title}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono border ${EFFORT_COLORS[strategy.effort]}`}>
                        {strategy.effort}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs font-mono">
                      <span className="text-slate-500">{strategy.service}</span>
                      <span className="text-error">{strategy.currentCost}</span>
                      <span className="text-slate-600">→</span>
                      <span className="text-success">{strategy.targetCost}</span>
                      <span className="text-accent font-bold">Save {strategy.savings}</span>
                    </div>
                  </div>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`text-slate-500 transition-transform ml-4 mt-1 flex-shrink-0 ${expandedStrategy === idx ? "rotate-180" : ""}`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {expandedStrategy === idx && (
                  <div className="px-5 pb-5 border-t border-slate-800">
                    <p className="text-sm text-slate-400 mt-4 leading-relaxed">
                      {strategy.description}
                    </p>
                    <div className="mt-4">
                      <p className="text-xs text-slate-500 font-mono uppercase tracking-wider mb-2">Action Steps</p>
                      <ol className="space-y-2">
                        {strategy.steps.map((step, stepIdx) => (
                          <li key={stepIdx} className="flex items-start gap-2 text-sm text-slate-300">
                            <span className="text-accent font-mono text-xs mt-0.5 flex-shrink-0">{stepIdx + 1}.</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Bottom note */}
            <div className="bg-accent/5 rounded-xl border border-accent/10 p-4 mt-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                <span className="text-accent font-bold">Priority order:</span> Start with #1 and #2 — they&apos;re the easiest wins with the biggest impact.
                Switching to Haiku for API calls and dropping Claude Max could save ~$1,100/mo alone.
                The full AIGlitch Grok optimization guide is at <span className="font-mono text-accent">docs/aiglitch-cost-optimization.md</span>.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
