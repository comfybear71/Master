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

const FIXED_SERVICES: { name: string; key: string; cost: number }[] = [
  { name: "ImprovMX", key: "improvmx", cost: 9.0 },
  { name: "X (Twitter)", key: "twitter", cost: 50.0 },
  { name: "Claude Max", key: "claudemax", cost: 100.0 },
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
  twitter: "\u{1D54F}",
  claudemax: "\u2728",
};

export default function CostsPage() {
  const [services, setServices] = useState<ServiceCost[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

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
          </div>
        ))}
      </div>
    </div>
  );
}
