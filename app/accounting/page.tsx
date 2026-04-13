"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Category {
  _id: string;
  name: string;
  type: "income" | "expense";
  icon: string;
}

interface Invoice {
  _id: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  vendor: string | null;
  categoryId: string | null;
  date: string | null;
  amount: number | null;
  gstAmount: number | null;
  status: string;
  ocrStatus: string;
  notes: string | null;
  createdAt: string;
}

interface Transaction {
  _id: string;
  type: "income" | "expense";
  amount: number;
  date: string;
  description: string;
  categoryId: string | null;
  invoiceId: string | null;
  notes: string | null;
  createdAt: string;
}

interface Summary {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  incomeCount: number;
  expenseCount: number;
}

type Tab = "invoices" | "ledger" | "summary";

export default function AccountingPage() {
  const [tab, setTab] = useState<Tab>("invoices");
  const [categories, setCategories] = useState<Category[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary>({
    totalIncome: 0,
    totalExpenses: 0,
    netProfit: 0,
    incomeCount: 0,
    expenseCount: 0,
  });
  const [invoiceTotals, setInvoiceTotals] = useState({ amount: 0, count: 0 });
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [ocrProcessing, setOcrProcessing] = useState<Set<string>>(new Set());
  const [editingInvoice, setEditingInvoice] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ vendor: "", amount: "", date: "", categoryId: "", notes: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New transaction form
  const [showTxForm, setShowTxForm] = useState(false);
  const [txForm, setTxForm] = useState({
    type: "expense" as "income" | "expense",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
    categoryId: "",
    notes: "",
  });

  // New category form
  const [showCatForm, setShowCatForm] = useState(false);
  const [catForm, setCatForm] = useState({ name: "", type: "expense" as "income" | "expense", icon: "" });

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/accounting/categories");
      const data = await res.json();
      if (Array.isArray(data)) setCategories(data);
    } catch { /* ignore */ }
  }, []);

  const fetchInvoices = useCallback(async () => {
    try {
      const res = await fetch("/api/accounting/invoices");
      const data = await res.json();
      if (data.invoices) {
        setInvoices(data.invoices);
        setInvoiceTotals(data.totals);
      }
    } catch { /* ignore */ }
  }, []);

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await fetch("/api/accounting/transactions");
      const data = await res.json();
      if (data.transactions) {
        setTransactions(data.transactions);
        setSummary(data.summary);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchInvoices();
    fetchTransactions();
  }, [fetchCategories, fetchInvoices, fetchTransactions]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadMsg("");
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }
      const res = await fetch("/api/accounting/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        setUploadMsg(`Uploaded ${data.count} invoice${data.count > 1 ? "s" : ""}. Running OCR...`);
        fetchInvoices();
        // Auto-trigger OCR for each uploaded invoice
        for (const inv of data.invoices) {
          triggerOcr(inv._id);
        }
      } else {
        setUploadMsg(data.error || "Upload failed");
      }
    } catch {
      setUploadMsg("Network error");
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const triggerOcr = async (invoiceId: string) => {
    setOcrProcessing((prev) => new Set(prev).add(invoiceId));
    try {
      await fetch("/api/accounting/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });
      fetchInvoices();
    } catch { /* ignore — invoice will show ocrStatus: "error" */ }
    setOcrProcessing((prev) => {
      const next = new Set(prev);
      next.delete(invoiceId);
      return next;
    });
  };

  const handleConfirmInvoice = async (inv: Invoice) => {
    if (!inv.amount || !inv.date) return;
    try {
      // Create a transaction from the confirmed invoice
      await fetch("/api/accounting/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "expense",
          amount: inv.amount,
          date: inv.date,
          description: inv.vendor ? `${inv.vendor} invoice` : inv.fileName,
          categoryId: inv.categoryId || "",
          invoiceId: inv._id,
        }),
      });
      // Mark invoice as confirmed
      await fetch("/api/accounting/invoices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: inv._id, status: "confirmed" }),
      });
      fetchInvoices();
      fetchTransactions();
    } catch { /* ignore */ }
  };

  const handleStartEdit = (inv: Invoice) => {
    setEditingInvoice(inv._id);
    setEditForm({
      vendor: inv.vendor || "",
      amount: inv.amount?.toString() || "",
      date: inv.date || "",
      categoryId: inv.categoryId || "",
      notes: inv.notes || "",
    });
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await fetch("/api/accounting/invoices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          vendor: editForm.vendor,
          amount: editForm.amount ? parseFloat(editForm.amount) : null,
          date: editForm.date,
          categoryId: editForm.categoryId,
          notes: editForm.notes,
        }),
      });
      setEditingInvoice(null);
      fetchInvoices();
    } catch { /* ignore */ }
  };

  const handleAddTransaction = async () => {
    if (!txForm.amount || !txForm.date) return;
    try {
      const res = await fetch("/api/accounting/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(txForm),
      });
      const data = await res.json();
      if (data._id) {
        setShowTxForm(false);
        setTxForm({ type: "expense", amount: "", date: new Date().toISOString().split("T")[0], description: "", categoryId: "", notes: "" });
        fetchTransactions();
      }
    } catch { /* ignore */ }
  };

  const handleAddCategory = async () => {
    if (!catForm.name) return;
    try {
      const res = await fetch("/api/accounting/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(catForm),
      });
      if (res.ok) {
        setShowCatForm(false);
        setCatForm({ name: "", type: "expense", icon: "" });
        fetchCategories();
      }
    } catch { /* ignore */ }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (!confirm("Delete this invoice?")) return;
    try {
      await fetch("/api/accounting/invoices", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      fetchInvoices();
    } catch { /* ignore */ }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm("Delete this transaction?")) return;
    try {
      await fetch("/api/accounting/transactions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      fetchTransactions();
    } catch { /* ignore */ }
  };

  const fmt = (n: number) => `$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const getCatName = (id: string | null) => {
    if (!id) return "Uncategorised";
    const cat = categories.find((c) => c._id === id);
    return cat ? `${cat.icon} ${cat.name}` : "Unknown";
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-1">Accounting</h1>
      <p className="text-slate-400 text-sm mb-6">
        Invoice vault, ledger, and P&L — Australian FY (Jul 1 – Jun 30)
      </p>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-base-card rounded-xl border border-slate-800 p-4">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Income</div>
          <div className="text-lg font-bold text-green-400">{fmt(summary.totalIncome)}</div>
          <div className="text-[10px] text-slate-600">{summary.incomeCount} entries</div>
        </div>
        <div className="bg-base-card rounded-xl border border-slate-800 p-4">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Expenses</div>
          <div className="text-lg font-bold text-red-400">{fmt(summary.totalExpenses)}</div>
          <div className="text-[10px] text-slate-600">{summary.expenseCount} entries</div>
        </div>
        <div className="bg-base-card rounded-xl border border-slate-800 p-4">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Net P&L</div>
          <div className={`text-lg font-bold ${summary.netProfit >= 0 ? "text-green-400" : "text-red-400"}`}>
            {fmt(summary.netProfit)}
          </div>
          <div className="text-[10px] text-slate-600">{summary.netProfit >= 0 ? "Profit" : "Loss"}</div>
        </div>
        <div className="bg-base-card rounded-xl border border-slate-800 p-4">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Invoices</div>
          <div className="text-lg font-bold text-accent">{invoiceTotals.count}</div>
          <div className="text-[10px] text-slate-600">{fmt(invoiceTotals.amount)} total</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-base-card rounded-lg border border-slate-800 p-1 w-fit">
        {(["invoices", "ledger", "summary"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t
                ? "bg-accent/10 text-accent border border-accent/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {t === "invoices" ? "Invoices" : t === "ledger" ? "Ledger" : "P&L Summary"}
          </button>
        ))}
      </div>

      {/* INVOICES TAB */}
      {tab === "invoices" && (
        <div className="space-y-4">
          {/* Upload zone */}
          <div
            className="bg-base-card rounded-xl border-2 border-dashed border-slate-700 hover:border-accent/40 p-8 text-center transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleUpload(e.dataTransfer.files); }}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif"
              className="hidden"
              onChange={(e) => handleUpload(e.target.files)}
            />
            <div className="text-3xl mb-2">{uploading ? "..." : "📄"}</div>
            <div className="text-white font-medium mb-1">
              {uploading ? "Uploading..." : "Drop invoices here or tap to upload"}
            </div>
            <div className="text-slate-500 text-xs">PDF, JPEG, PNG, WebP, HEIC — up to 20MB each — bulk upload supported</div>
            {uploadMsg && (
              <div className={`mt-3 text-sm ${uploadMsg.startsWith("Upload") ? "text-green-400" : "text-red-400"}`}>
                {uploadMsg}
              </div>
            )}
          </div>

          {/* Invoice list */}
          <div className="bg-base-card rounded-xl border border-slate-800">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-white font-semibold text-sm">{invoices.length} Invoices</h2>
            </div>
            {invoices.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                No invoices uploaded yet. Drop files above to get started.
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {invoices.map((inv) => (
                  <div key={inv._id} className="p-3 hover:bg-slate-800/30 transition-colors">
                    {editingInvoice === inv._id ? (
                      /* Edit mode */
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          <input type="text" placeholder="Vendor" value={editForm.vendor}
                            onChange={(e) => setEditForm((f) => ({ ...f, vendor: e.target.value }))}
                            className="bg-black/40 border border-slate-700 rounded px-2 py-1.5 text-white text-sm focus:border-accent outline-none" />
                          <input type="number" step="0.01" placeholder="Amount" value={editForm.amount}
                            onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))}
                            className="bg-black/40 border border-slate-700 rounded px-2 py-1.5 text-white text-sm focus:border-accent outline-none" />
                          <input type="date" value={editForm.date}
                            onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))}
                            className="bg-black/40 border border-slate-700 rounded px-2 py-1.5 text-white text-sm focus:border-accent outline-none" />
                          <select value={editForm.categoryId}
                            onChange={(e) => setEditForm((f) => ({ ...f, categoryId: e.target.value }))}
                            className="bg-black/40 border border-slate-700 rounded px-2 py-1.5 text-white text-sm focus:border-accent outline-none">
                            <option value="">Category</option>
                            {categories.filter((c) => c.type === "expense").map((c) => (
                              <option key={c._id} value={c._id}>{c.icon} {c.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleSaveEdit(inv._id)}
                            className="px-3 py-1 rounded text-xs bg-accent/10 text-accent border border-accent/20">Save</button>
                          <button onClick={() => setEditingInvoice(null)}
                            className="px-3 py-1 rounded text-xs text-slate-400 hover:text-white">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      /* View mode */
                      <div className="flex items-center gap-3">
                        <div className="text-xl shrink-0">
                          {inv.fileType === "application/pdf" ? "📄" : "🖼️"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-sm font-medium truncate">{inv.vendor || inv.fileName}</div>
                          <div className="text-slate-500 text-[11px] flex items-center gap-2 flex-wrap">
                            {inv.vendor && <span className="text-slate-600 truncate">{inv.fileName}</span>}
                            {inv.date && <span>{inv.date}</span>}
                            {inv.amount != null && <span className="text-green-400 font-medium">{fmt(inv.amount)}</span>}
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium uppercase ${
                              inv.status === "confirmed" ? "bg-green-500/10 text-green-400"
                                : inv.ocrStatus === "processing" || ocrProcessing.has(inv._id) ? "bg-blue-500/10 text-blue-400"
                                : inv.ocrStatus === "complete" ? "bg-amber-500/10 text-amber-400"
                                : inv.ocrStatus === "error" ? "bg-red-500/10 text-red-400"
                                : "bg-slate-500/10 text-slate-400"
                            }`}>
                              {inv.status === "confirmed" ? "Confirmed"
                                : ocrProcessing.has(inv._id) ? "Reading..."
                                : inv.ocrStatus === "processing" ? "Reading..."
                                : inv.ocrStatus === "complete" ? "Review"
                                : inv.ocrStatus === "error" ? "OCR Failed"
                                : "Pending"}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0 flex-wrap justify-end">
                          {inv.ocrStatus !== "complete" && inv.status !== "confirmed" && !ocrProcessing.has(inv._id) && (
                            <button onClick={() => triggerOcr(inv._id)}
                              className="px-2 py-1 rounded text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors">
                              OCR
                            </button>
                          )}
                          {inv.ocrStatus === "complete" && inv.status !== "confirmed" && (
                            <button onClick={() => handleConfirmInvoice(inv)}
                              className="px-2 py-1 rounded text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors">
                              Confirm
                            </button>
                          )}
                          {inv.status !== "confirmed" && (
                            <button onClick={() => handleStartEdit(inv)}
                              className="px-2 py-1 rounded text-[10px] bg-slate-700 text-slate-300 hover:text-accent transition-colors">
                              Edit
                            </button>
                          )}
                          <a href={inv.fileUrl} target="_blank" rel="noopener noreferrer"
                            className="px-2 py-1 rounded text-[10px] bg-slate-700 text-slate-300 hover:text-accent transition-colors">
                            View
                          </a>
                          <button onClick={() => handleDeleteInvoice(inv._id)}
                            className="px-2 py-1 rounded text-[10px] bg-slate-700 text-slate-300 hover:text-red-400 transition-colors">
                            Del
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* LEDGER TAB */}
      {tab === "ledger" && (
        <div className="space-y-4">
          {/* Add transaction button */}
          <div className="flex gap-2">
            <button
              onClick={() => { setShowTxForm(!showTxForm); setTxForm((f) => ({ ...f, type: "expense" })); }}
              className="px-3 py-2 rounded-lg text-sm bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors"
            >
              + Expense
            </button>
            <button
              onClick={() => { setShowTxForm(!showTxForm); setTxForm((f) => ({ ...f, type: "income" })); }}
              className="px-3 py-2 rounded-lg text-sm bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 transition-colors"
            >
              + Income
            </button>
            <button
              onClick={() => setShowCatForm(!showCatForm)}
              className="px-3 py-2 rounded-lg text-sm bg-slate-700 text-slate-300 hover:text-accent border border-slate-600 transition-colors ml-auto"
            >
              + Category
            </button>
          </div>

          {/* New category form */}
          {showCatForm && (
            <div className="bg-base-card rounded-xl border border-accent/20 p-4 space-y-3">
              <h3 className="text-white text-sm font-semibold">New Category</h3>
              <div className="flex gap-2 flex-wrap">
                <input
                  type="text"
                  placeholder="Category name"
                  value={catForm.name}
                  onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))}
                  className="flex-1 min-w-[200px] bg-black/40 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-accent outline-none"
                />
                <select
                  value={catForm.type}
                  onChange={(e) => setCatForm((f) => ({ ...f, type: e.target.value as "income" | "expense" }))}
                  className="bg-black/40 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-accent outline-none"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
                <input
                  type="text"
                  placeholder="Icon (emoji)"
                  value={catForm.icon}
                  onChange={(e) => setCatForm((f) => ({ ...f, icon: e.target.value }))}
                  className="w-20 bg-black/40 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-accent outline-none"
                />
                <button onClick={handleAddCategory} className="px-4 py-2 rounded-lg text-sm bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20">
                  Add
                </button>
              </div>
            </div>
          )}

          {/* New transaction form */}
          {showTxForm && (
            <div className={`bg-base-card rounded-xl border p-4 space-y-3 ${
              txForm.type === "income" ? "border-green-500/20" : "border-red-500/20"
            }`}>
              <h3 className="text-white text-sm font-semibold">
                New {txForm.type === "income" ? "Income" : "Expense"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Amount (AUD)"
                  value={txForm.amount}
                  onChange={(e) => setTxForm((f) => ({ ...f, amount: e.target.value }))}
                  className="bg-black/40 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-accent outline-none"
                />
                <input
                  type="date"
                  value={txForm.date}
                  onChange={(e) => setTxForm((f) => ({ ...f, date: e.target.value }))}
                  className="bg-black/40 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-accent outline-none"
                />
                <select
                  value={txForm.categoryId}
                  onChange={(e) => setTxForm((f) => ({ ...f, categoryId: e.target.value }))}
                  className="bg-black/40 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-accent outline-none"
                >
                  <option value="">Select category</option>
                  {categories
                    .filter((c) => c.type === txForm.type)
                    .map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                </select>
              </div>
              <input
                type="text"
                placeholder="Description"
                value={txForm.description}
                onChange={(e) => setTxForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full bg-black/40 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-accent outline-none"
              />
              <div className="flex gap-2">
                <button onClick={handleAddTransaction} className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  txForm.type === "income"
                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    : "bg-red-500/20 text-red-400 border border-red-500/30"
                }`}>
                  Add {txForm.type === "income" ? "Income" : "Expense"}
                </button>
                <button onClick={() => setShowTxForm(false)} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Transactions list */}
          <div className="bg-base-card rounded-xl border border-slate-800">
            <div className="p-4 border-b border-slate-800">
              <h2 className="text-white font-semibold text-sm">{transactions.length} Transactions</h2>
            </div>
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                No transactions yet. Click &quot;+ Expense&quot; or &quot;+ Income&quot; to add one.
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {transactions.map((tx) => (
                  <div key={tx._id} className="p-3 flex items-center gap-3 hover:bg-slate-800/30 transition-colors">
                    <div className={`text-lg shrink-0 w-8 text-center ${
                      tx.type === "income" ? "text-green-400" : "text-red-400"
                    }`}>
                      {tx.type === "income" ? "+" : "-"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium truncate">
                        {tx.description || getCatName(tx.categoryId)}
                      </div>
                      <div className="text-slate-500 text-[11px] flex items-center gap-2">
                        <span>{tx.date}</span>
                        <span className="text-slate-600">{getCatName(tx.categoryId)}</span>
                      </div>
                    </div>
                    <div className={`text-sm font-bold shrink-0 ${
                      tx.type === "income" ? "text-green-400" : "text-red-400"
                    }`}>
                      {tx.type === "income" ? "+" : "-"}{fmt(tx.amount)}
                    </div>
                    <button
                      onClick={() => handleDeleteTransaction(tx._id)}
                      className="px-2 py-1 rounded text-[10px] bg-slate-700 text-slate-300 hover:text-red-400 transition-colors shrink-0"
                    >
                      Del
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUMMARY TAB */}
      {tab === "summary" && (
        <div className="space-y-4">
          {/* P&L Overview */}
          <div className="bg-base-card rounded-xl border border-slate-800 p-6">
            <h2 className="text-white font-semibold mb-4">Profit & Loss — Since January 2026</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-800">
                <span className="text-slate-400">Total Income</span>
                <span className="text-green-400 font-bold text-lg">{fmt(summary.totalIncome)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-800">
                <span className="text-slate-400">Total Expenses</span>
                <span className="text-red-400 font-bold text-lg">{fmt(summary.totalExpenses)}</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-white font-semibold">Net Profit / (Loss)</span>
                <span className={`font-bold text-xl ${summary.netProfit >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {fmt(summary.netProfit)}
                </span>
              </div>
            </div>
          </div>

          {/* Category breakdown */}
          <div className="bg-base-card rounded-xl border border-slate-800 p-6">
            <h2 className="text-white font-semibold mb-4">Expense Breakdown by Category</h2>
            {categories.filter((c) => c.type === "expense").length === 0 ? (
              <div className="text-slate-500 text-sm">No expense categories yet.</div>
            ) : (
              <div className="space-y-2">
                {categories
                  .filter((c) => c.type === "expense")
                  .map((cat) => {
                    const catTotal = transactions
                      .filter((t) => t.categoryId === cat._id && t.type === "expense")
                      .reduce((sum, t) => sum + t.amount, 0);
                    const pct = summary.totalExpenses > 0 ? (catTotal / summary.totalExpenses) * 100 : 0;
                    if (catTotal === 0) return null;
                    return (
                      <div key={cat._id} className="flex items-center gap-3">
                        <span className="text-sm w-6">{cat.icon}</span>
                        <span className="text-slate-300 text-sm flex-1 truncate">{cat.name}</span>
                        <div className="w-32 bg-slate-800 rounded-full h-2 shrink-0">
                          <div
                            className="bg-accent rounded-full h-2"
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <span className="text-red-400 text-sm font-medium w-24 text-right">{fmt(catTotal)}</span>
                        <span className="text-slate-600 text-[10px] w-10 text-right">{pct.toFixed(0)}%</span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Income breakdown */}
          <div className="bg-base-card rounded-xl border border-slate-800 p-6">
            <h2 className="text-white font-semibold mb-4">Income Breakdown by Category</h2>
            {categories.filter((c) => c.type === "income").length === 0 ? (
              <div className="text-slate-500 text-sm">No income categories yet.</div>
            ) : (
              <div className="space-y-2">
                {categories
                  .filter((c) => c.type === "income")
                  .map((cat) => {
                    const catTotal = transactions
                      .filter((t) => t.categoryId === cat._id && t.type === "income")
                      .reduce((sum, t) => sum + t.amount, 0);
                    if (catTotal === 0) return null;
                    return (
                      <div key={cat._id} className="flex items-center gap-3">
                        <span className="text-sm w-6">{cat.icon}</span>
                        <span className="text-slate-300 text-sm flex-1 truncate">{cat.name}</span>
                        <span className="text-green-400 text-sm font-medium">{fmt(catTotal)}</span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Tenants quick reference */}
          <div className="bg-base-card rounded-xl border border-slate-800 p-6">
            <h2 className="text-white font-semibold mb-4">Rental Income Schedule</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 text-xs uppercase tracking-wider border-b border-slate-800">
                    <th className="p-2">Tenant</th>
                    <th className="p-2">Weekly Rent</th>
                    <th className="p-2">Monthly (approx)</th>
                    <th className="p-2">Annual</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-800/50">
                    <td className="p-2 text-slate-300">Tenant 1</td>
                    <td className="p-2 text-green-400 font-medium">$250</td>
                    <td className="p-2 text-slate-400">$1,083</td>
                    <td className="p-2 text-slate-400">$13,000</td>
                  </tr>
                  <tr className="border-b border-slate-800/50">
                    <td className="p-2 text-slate-300">Tenant 2</td>
                    <td className="p-2 text-green-400 font-medium">$200</td>
                    <td className="p-2 text-slate-400">$867</td>
                    <td className="p-2 text-slate-400">$10,400</td>
                  </tr>
                  <tr className="font-semibold">
                    <td className="p-2 text-white">Total</td>
                    <td className="p-2 text-green-400">$450</td>
                    <td className="p-2 text-green-400">$1,950</td>
                    <td className="p-2 text-green-400">$23,400</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-slate-600 text-[10px] mt-2">
              Tenant names can be updated later. Rent receipts and automated tracking coming in a future session.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
