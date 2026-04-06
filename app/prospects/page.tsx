"use client";

import { useEffect, useState, useCallback } from "react";

interface Prospect {
  _id: string;
  company: string;
  industry: string;
  subCategory: string;
  website: string;
  linkedinTitle: string;
  email: string;
  country: string;
  notes: string;
  status: string;
  followUpDate: string | null;
  lastContactedAt: string | null;
  emailsSent: number;
}

interface ProspectStats {
  total: number;
  byStatus: Record<string, number>;
  byIndustry: Array<{ industry: string; count: number }>;
}

interface GeneratedEmail {
  subject: string;
  body: string;
  followUpSubject: string;
  followUpBody: string;
}

const statusColors: Record<string, string> = {
  new: "bg-slate-500/20 text-slate-300",
  contacted: "bg-cyan-500/20 text-cyan-400",
  replied: "bg-green-500/20 text-green-400",
  meeting: "bg-purple-500/20 text-purple-400",
  closed: "bg-yellow-500/20 text-yellow-400",
  rejected: "bg-red-500/20 text-red-400",
  not_interested: "bg-slate-600/20 text-slate-500",
};

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [stats, setStats] = useState<ProspectStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterIndustry, setFilterIndustry] = useState("all");
  const [sortByEmail, setSortByEmail] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [emailModal, setEmailModal] = useState<{ prospect: Prospect; email?: GeneratedEmail } | null>(null);
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [emailTone, setEmailTone] = useState<"casual" | "formal" | "bold">("casual");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkResults, setBulkResults] = useState<Array<{ company: string; success: boolean }> | null>(null);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<{ id: string; success: boolean; message: string } | null>(null);
  const [selectedPersona, setSelectedPersona] = useState<"founder" | "architect" | "ads">("founder");

  const PAGE_SIZE = 30;

  const fetchProspects = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      skip: String(page * PAGE_SIZE),
    });
    if (search) params.set("search", search);
    if (filterStatus !== "all") params.set("status", filterStatus);
    if (filterIndustry !== "all") params.set("industry", filterIndustry);

    const res = await fetch(`/api/prospects?${params}`);
    if (res.ok) {
      const data = await res.json();
      setProspects(data.prospects || []);
      setTotal(data.total || 0);
    }
    setLoading(false);
  }, [page, search, filterStatus, filterIndustry]);

  const fetchStats = async () => {
    const res = await fetch("/api/prospects?action=stats");
    if (res.ok) setStats(await res.json());
  };

  useEffect(() => {
    fetchProspects();
    fetchStats();
  }, [fetchProspects]);

  const importProspects = async () => {
    setImporting(true);
    const res = await fetch("/api/prospects?action=import");
    if (res.ok) {
      const data = await res.json();
      alert(`Imported ${data.imported} prospects (${data.skipped} already existed)`);
      fetchProspects();
      fetchStats();
    }
    setImporting(false);
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch("/api/prospects?action=update-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prospectId: id, status }),
    });
    fetchProspects();
    fetchStats();
  };

  const generateEmail = async (prospect: Prospect) => {
    setEmailModal({ prospect });
    setGeneratingEmail(true);
    const res = await fetch("/api/prospects?action=generate-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prospectId: prospect._id, tone: emailTone }),
    });
    if (res.ok) {
      const data = await res.json();
      setEmailModal({ prospect, email: data.email });
    }
    setGeneratingEmail(false);
  };

  const markContacted = async (id: string) => {
    await fetch("/api/prospects?action=mark-contacted", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prospectId: id }),
    });
    fetchProspects();
  };

  const bulkGenerate = async () => {
    if (selected.size === 0) return;
    setBulkGenerating(true);
    setBulkResults(null);
    const res = await fetch("/api/prospects?action=bulk-generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prospectIds: Array.from(selected), tone: emailTone }),
    });
    if (res.ok) {
      const data = await res.json();
      setBulkResults(data.results);
    }
    setBulkGenerating(false);
    setSelected(new Set());
  };

  const sendTemplateEmail = async (prospect: Prospect) => {
    if (!prospect.email) {
      setSendResult({ id: prospect._id, success: false, message: "No email address" });
      setTimeout(() => setSendResult(null), 3000);
      return;
    }
    setSendingEmail(prospect._id);
    setSendResult(null);
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prospectId: prospect._id,
          tone: emailTone,
          persona: selectedPersona,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSendResult({ id: prospect._id, success: true, message: `Sent to ${data.to}` });
        fetchProspects();
        fetchStats();
      } else {
        setSendResult({ id: prospect._id, success: false, message: data.error || "Failed" });
      }
    } catch {
      setSendResult({ id: prospect._id, success: false, message: "Network error" });
    }
    setSendingEmail(null);
    setTimeout(() => setSendResult(null), 4000);
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const selectAll = () => {
    if (selected.size === prospects.length) setSelected(new Set());
    else setSelected(new Set(prospects.map((p) => p._id)));
  };

  const industries = stats?.byIndustry?.map((i) => i.industry).filter(Boolean) || [];

  return (
    <div className="p-4 md:p-8 max-w-full mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Sponsor Prospects</h1>
          <p className="text-sm text-slate-500 mt-1">
            {stats?.total || 0} prospects across {industries.length} industries
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {selected.size > 0 && (
            <button onClick={bulkGenerate} disabled={bulkGenerating} className="px-3 py-2 bg-accent/10 text-accent border border-accent/20 rounded-lg text-xs font-mono hover:bg-accent/20 disabled:opacity-50">
              {bulkGenerating ? "Generating..." : `Generate ${selected.size} Emails`}
            </button>
          )}
          <button onClick={importProspects} disabled={importing} className="px-3 py-2 bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg text-xs font-mono hover:bg-green-500/20 disabled:opacity-50">
            {importing ? "Importing..." : "Import from Excel"}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 mb-6">
          {["new", "contacted", "replied", "meeting", "closed", "rejected", "not_interested"].map((s) => (
            <button key={s} onClick={() => setFilterStatus(filterStatus === s ? "all" : s)}
              className={`rounded-lg border p-3 text-center transition-colors ${
                filterStatus === s ? "border-accent bg-accent/10" : "border-slate-800 bg-base-card hover:border-slate-700"
              }`}>
              <div className="text-lg font-bold font-mono text-white">{stats.byStatus[s] || 0}</div>
              <div className="text-[10px] text-slate-500 capitalize">{s.replace("_", " ")}</div>
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          placeholder="Search companies, industries, notes..."
          className="flex-1 min-w-[200px] bg-base border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-accent focus:outline-none"
        />
        <select
          value={filterIndustry}
          onChange={(e) => { setFilterIndustry(e.target.value); setPage(0); }}
          className="bg-base border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-accent focus:outline-none"
        >
          <option value="all">All Industries</option>
          {industries.map((i) => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
        <div className="flex gap-1">
          {(["founder", "architect", "ads"] as const).map((p) => (
            <button key={p} onClick={() => setSelectedPersona(p)}
              className={`px-3 py-2 rounded-lg text-xs font-mono ${
                selectedPersona === p ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-slate-800 text-slate-400 border border-slate-700"
              }`}>
              {p}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {(["casual", "formal", "bold"] as const).map((t) => (
            <button key={t} onClick={() => setEmailTone(t)}
              className={`px-3 py-2 rounded-lg text-xs font-mono ${
                emailTone === t ? "bg-accent/20 text-accent border border-accent/30" : "bg-slate-800 text-slate-400 border border-slate-700"
              }`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Results */}
      {bulkResults && (
        <div className="bg-base-card rounded-lg border border-accent/20 p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-accent">Bulk Email Generation Results</h3>
            <button onClick={() => setBulkResults(null)} className="text-xs text-slate-500">Dismiss</button>
          </div>
          <div className="space-y-1">
            {bulkResults.map((r, i) => (
              <div key={i} className={`text-xs font-mono ${r.success ? "text-green-400" : "text-red-400"}`}>
                {r.success ? "+" : "x"} {r.company}
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">Emails saved to Growth &rarr; Outreach tab</p>
        </div>
      )}

      {/* Prospect Table */}
      <div className="bg-base-card rounded-xl border border-slate-800 overflow-x-auto w-full">
        <table className="w-full text-sm min-w-[1000px]">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="p-3 text-left">
                <input type="checkbox" checked={selected.size === prospects.length && prospects.length > 0}
                  onChange={selectAll} className="rounded" />
              </th>
              <th className="p-3 text-left text-slate-400 font-medium text-xs">Company</th>
              <th className="p-3 text-left text-slate-400 font-medium text-xs">Industry</th>
              <th className="p-3 text-left text-slate-400 font-medium text-xs cursor-pointer hover:text-white transition-colors" onClick={() => setSortByEmail(!sortByEmail)}>
                Contact {sortByEmail ? "\u2191" : "\u2195"}
              </th>
              <th className="p-3 text-left text-slate-400 font-medium text-xs">Country</th>
              <th className="p-3 text-left text-slate-400 font-medium text-xs">Status</th>
              <th className="p-3 text-left text-slate-400 font-medium text-xs">Emails</th>
              <th className="p-3 text-left text-slate-400 font-medium text-xs">Actions</th>
            </tr>
          </thead>
          <tbody>
            {[...prospects].sort((a, b) => {
              if (!sortByEmail) return 0;
              const aHas = a.email && a.email !== "Contact via website" ? 0 : 1;
              const bHas = b.email && b.email !== "Contact via website" ? 0 : 1;
              return aHas - bHas;
            }).map((p) => (
              <tr key={p._id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                <td className="p-3">
                  <input type="checkbox" checked={selected.has(p._id)}
                    onChange={() => toggleSelect(p._id)} className="rounded" />
                </td>
                <td className="p-3">
                  <div className="font-semibold text-white text-xs">{p.company}</div>
                  {p.website && (
                    <a href={`https://${p.website}`} target="_blank" rel="noopener noreferrer"
                      className="text-[10px] text-accent hover:underline">{p.website}</a>
                  )}
                  {p.notes && <div className="text-[10px] text-slate-600 mt-0.5 italic line-clamp-1">{p.notes}</div>}
                </td>
                <td className="p-3">
                  <div className="text-xs text-slate-300">{p.industry}</div>
                  <div className="text-[10px] text-slate-500">{p.subCategory}</div>
                </td>
                <td className="p-3">
                  <div className="text-[10px] text-slate-400">{p.linkedinTitle}</div>
                  {p.email && !p.email.includes("Contact via") ? (
                    <a href={`mailto:${p.email}`} className="text-[10px] text-cyan-400 hover:underline">{p.email}</a>
                  ) : (
                    <span className="text-[10px] text-slate-600">{p.email || "No email"}</span>
                  )}
                </td>
                <td className="p-3 text-xs text-slate-400">{p.country}</td>
                <td className="p-3">
                  <select value={p.status} onChange={(e) => updateStatus(p._id, e.target.value)}
                    className={`text-[10px] font-mono px-2 py-1 rounded-full border-0 cursor-pointer ${statusColors[p.status] || statusColors.new}`}>
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="replied">Replied</option>
                    <option value="meeting">Meeting</option>
                    <option value="closed">Closed</option>
                    <option value="rejected">Rejected</option>
                    <option value="not_interested">Not Interested</option>
                  </select>
                </td>
                <td className="p-3 text-xs font-mono text-slate-400">{p.emailsSent || 0}</td>
                <td className="p-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex gap-1">
                      <button
                        onClick={() => sendTemplateEmail(p)}
                        disabled={sendingEmail === p._id || !p.email}
                        className={`text-[10px] px-2 py-1 rounded font-mono ${
                          sendingEmail === p._id
                            ? "bg-yellow-500/20 text-yellow-400 animate-pulse"
                            : !p.email
                            ? "bg-slate-700/20 text-slate-600 cursor-not-allowed"
                            : "bg-accent/10 text-accent hover:bg-accent/20"
                        }`}
                      >
                        {sendingEmail === p._id ? "Sending..." : "Email"}
                      </button>
                      <button onClick={() => markContacted(p._id)}
                        className="text-[10px] px-2 py-1 bg-cyan-500/10 text-cyan-400 rounded hover:bg-cyan-500/20 font-mono">
                        Sent
                      </button>
                    </div>
                    {sendResult?.id === p._id && (
                      <span className={`text-[9px] font-mono ${sendResult.success ? "text-green-400" : "text-red-400"}`}>
                        {sendResult.message}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {prospects.length === 0 && !loading && (
              <tr>
                <td colSpan={8} className="p-12 text-center text-slate-500">
                  {stats?.total === 0 ? (
                    <div>
                      <p className="text-lg mb-2">No prospects imported yet</p>
                      <p className="text-sm mb-4">Click &quot;Import from Excel&quot; to load the prospect list</p>
                      <button onClick={importProspects} className="px-4 py-2 bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg text-sm font-mono">
                        Import Prospects
                      </button>
                    </div>
                  ) : (
                    "No prospects match your filters"
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-slate-500">
            Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
              className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded text-xs disabled:opacity-30">Prev</button>
            <button onClick={() => setPage(page + 1)} disabled={(page + 1) * PAGE_SIZE >= total}
              className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded text-xs disabled:opacity-30">Next</button>
          </div>
        </div>
      )}

      {/* Email Generation Modal */}
      {emailModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-base-card rounded-xl border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Email for {emailModal.prospect.company}</h3>
              <button onClick={() => setEmailModal(null)} className="text-slate-400 hover:text-white text-lg">&times;</button>
            </div>

            {generatingEmail ? (
              <div className="text-center py-12">
                <p className="text-accent font-mono text-sm animate-pulse">Generating personalized email...</p>
                <p className="text-xs text-slate-500 mt-2">Claude is crafting a pitch using your platform stats</p>
              </div>
            ) : emailModal.email ? (
              <div className="space-y-4">
                {/* Initial Email */}
                <div className="bg-base rounded-lg border border-slate-800 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-accent">Initial Email</h4>
                    <button onClick={() => copyToClipboard(`Subject: ${emailModal.email!.subject}\n\n${emailModal.email!.body}`, "initial")}
                      className={`text-[10px] font-mono px-2 py-1 rounded ${copiedField === "initial" ? "bg-green-500/20 text-green-400" : "bg-slate-800 text-slate-400 hover:text-white"}`}>
                      {copiedField === "initial" ? "Copied!" : "Copy All"}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mb-2"><span className="text-slate-500">Subject:</span> {emailModal.email.subject}</p>
                  <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">{emailModal.email.body}</p>
                </div>

                {/* Follow-up */}
                <div className="bg-base rounded-lg border border-slate-800 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-amber-400">Follow-Up (5 days later)</h4>
                    <button onClick={() => copyToClipboard(`Subject: ${emailModal.email!.followUpSubject}\n\n${emailModal.email!.followUpBody}`, "followup")}
                      className={`text-[10px] font-mono px-2 py-1 rounded ${copiedField === "followup" ? "bg-green-500/20 text-green-400" : "bg-slate-800 text-slate-400 hover:text-white"}`}>
                      {copiedField === "followup" ? "Copied!" : "Copy All"}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mb-2"><span className="text-slate-500">Subject:</span> {emailModal.email.followUpSubject}</p>
                  <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">{emailModal.email.followUpBody}</p>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => { markContacted(emailModal.prospect._id); setEmailModal(null); }}
                    className="px-4 py-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg text-xs font-mono">
                    Mark as Contacted
                  </button>
                  <button onClick={() => setEmailModal(null)}
                    className="px-4 py-2 text-slate-400 text-xs hover:text-white">
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-red-400 text-sm">Failed to generate email</p>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
