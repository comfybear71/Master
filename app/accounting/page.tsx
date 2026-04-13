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
  documentType?: "invoice" | "payslip";
  payslipData?: {
    grossPay: number | null;
    netPay: number | null;
    payg: number | null;
    superannuation: number | null;
    superRate: number | null;
    payPeriodStart: string | null;
    payPeriodEnd: string | null;
    ytdGross: number | null;
    ytdTax: number | null;
    ytdSuper: number | null;
    employer: string | null;
  };
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

type Tab = "invoices" | "ledger" | "summary" | "tax";

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
    const isPayslip = inv.documentType === "payslip";
    try {
      // Create a transaction from the confirmed document
      // Payslips → income (gross pay), Invoices → expense
      await fetch("/api/accounting/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: isPayslip ? "income" : "expense",
          amount: isPayslip && inv.payslipData?.grossPay ? inv.payslipData.grossPay : inv.amount,
          date: inv.date,
          description: isPayslip
            ? `${inv.vendor || "Salary"} — gross $${inv.payslipData?.grossPay || inv.amount}, PAYG $${inv.payslipData?.payg || 0}, super $${inv.payslipData?.superannuation || 0}`
            : inv.vendor ? `${inv.vendor} invoice` : inv.fileName,
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
        {(["invoices", "ledger", "summary", "tax"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t
                ? "bg-accent/10 text-accent border border-accent/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {t === "invoices" ? "Invoices" : t === "ledger" ? "Ledger" : t === "summary" ? "P&L Summary" : "ATO Tax Guide"}
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
                          <div className="text-white text-sm font-medium truncate">
                            {inv.documentType === "payslip" && <span className="text-purple-400 mr-1">[PAYSLIP]</span>}
                            {inv.vendor || inv.fileName}
                          </div>
                          <div className="text-slate-500 text-[11px] flex items-center gap-2 flex-wrap">
                            {inv.vendor && <span className="text-slate-600 truncate">{inv.fileName}</span>}
                            {inv.date && <span>{inv.date}</span>}
                            {inv.amount != null && <span className={`font-medium ${inv.documentType === "payslip" ? "text-purple-400" : "text-green-400"}`}>{fmt(inv.amount)}</span>}
                            {inv.payslipData && (
                              <>
                                {inv.payslipData.grossPay != null && <span className="text-green-400">Gross: {fmt(inv.payslipData.grossPay)}</span>}
                                {inv.payslipData.payg != null && <span className="text-red-400">PAYG: {fmt(inv.payslipData.payg)}</span>}
                                {inv.payslipData.superannuation != null && <span className="text-amber-400">Super: {fmt(inv.payslipData.superannuation)}</span>}
                              </>
                            )}
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
                          <a href={`/api/accounting/file?id=${inv._id}`} target="_blank" rel="noopener noreferrer"
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

      {/* ATO TAX GUIDE TAB */}
      {tab === "tax" && (
        <div className="space-y-4">
          {/* Disclaimer */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
            <div className="text-amber-400 text-sm font-semibold mb-1">Disclaimer</div>
            <div className="text-amber-400/70 text-xs">
              This is general information based on ATO published rates for 2025-26. It is NOT tax advice.
              Always confirm with your accountant before claiming deductions or making tax decisions.
            </div>
          </div>

          {/* Tax Brackets */}
          <div className="bg-base-card rounded-xl border border-slate-800 p-6">
            <h2 className="text-white font-semibold mb-4">Australian Tax Brackets 2025-26</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 text-xs uppercase tracking-wider border-b border-slate-800">
                    <th className="p-2">Taxable Income</th>
                    <th className="p-2">Tax Rate</th>
                    <th className="p-2">Tax on This Bracket</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-800/50">
                    <td className="p-2 text-slate-300">$0 – $18,200</td>
                    <td className="p-2 text-green-400">0%</td>
                    <td className="p-2 text-slate-400">Nil</td>
                  </tr>
                  <tr className="border-b border-slate-800/50">
                    <td className="p-2 text-slate-300">$18,201 – $45,000</td>
                    <td className="p-2 text-accent">16%</td>
                    <td className="p-2 text-slate-400">$0 + 16c per $1 over $18,200</td>
                  </tr>
                  <tr className="border-b border-slate-800/50">
                    <td className="p-2 text-slate-300">$45,001 – $135,000</td>
                    <td className="p-2 text-amber-400">30%</td>
                    <td className="p-2 text-slate-400">$4,288 + 30c per $1 over $45,000</td>
                  </tr>
                  <tr className="border-b border-slate-800/50">
                    <td className="p-2 text-slate-300">$135,001 – $190,000</td>
                    <td className="p-2 text-orange-400">37%</td>
                    <td className="p-2 text-slate-400">$31,288 + 37c per $1 over $135,000</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-slate-300">$190,001+</td>
                    <td className="p-2 text-red-400">45%</td>
                    <td className="p-2 text-slate-400">$51,638 + 45c per $1 over $190,000</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-slate-600 text-[10px] mt-3">
              Plus Medicare Levy of 2% on taxable income. Low-income earners may get a reduction/exemption.
            </p>
          </div>

          {/* Superannuation */}
          <div className="bg-base-card rounded-xl border border-slate-800 p-6">
            <h2 className="text-white font-semibold mb-4">Superannuation 2025-26</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-black/20 rounded-lg p-3">
                <div className="text-[10px] text-slate-500 uppercase">SG Rate</div>
                <div className="text-lg font-bold text-accent">11.5%</div>
                <div className="text-[10px] text-slate-600">of ordinary time earnings</div>
              </div>
              <div className="bg-black/20 rounded-lg p-3">
                <div className="text-[10px] text-slate-500 uppercase">Concessional Cap</div>
                <div className="text-lg font-bold text-white">$30,000</div>
                <div className="text-[10px] text-slate-600">per year (pre-tax contributions)</div>
              </div>
              <div className="bg-black/20 rounded-lg p-3">
                <div className="text-[10px] text-slate-500 uppercase">Non-Concessional Cap</div>
                <div className="text-lg font-bold text-white">$120,000</div>
                <div className="text-[10px] text-slate-600">per year (after-tax contributions)</div>
              </div>
            </div>
          </div>

          {/* Home Office Deductions */}
          <div className="bg-base-card rounded-xl border border-slate-800 p-6">
            <h2 className="text-white font-semibold mb-4">Home Office Deductions</h2>
            <p className="text-slate-400 text-sm mb-3">
              Since you work from home on AIG!itch and your other projects, you can claim home office expenses.
              Two methods available:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-black/20 rounded-lg p-4 border border-accent/10">
                <div className="text-accent text-sm font-semibold mb-2">Fixed Rate Method (Simpler)</div>
                <div className="text-2xl font-bold text-white mb-1">67c <span className="text-sm text-slate-400">per hour</span></div>
                <ul className="text-slate-400 text-xs space-y-1 mt-2">
                  <li>- Covers electricity, internet, phone, stationery</li>
                  <li>- Keep a log of hours worked from home</li>
                  <li>- Can ALSO claim separate deductions for:</li>
                  <li className="text-accent ml-2">• Office equipment (desk, chair, monitor)</li>
                  <li className="text-accent ml-2">• Technology (laptop, iPad, software)</li>
                  <li className="text-accent ml-2">• Depreciation on assets over $300</li>
                </ul>
              </div>
              <div className="bg-black/20 rounded-lg p-4">
                <div className="text-slate-300 text-sm font-semibold mb-2">Actual Cost Method (More work)</div>
                <div className="text-slate-400 text-xs space-y-1">
                  <p>Calculate the actual cost of running your home office:</p>
                  <ul className="mt-2 space-y-1">
                    <li>- Internet: business % of total bill</li>
                    <li>- Electricity: floor area % of total bill</li>
                    <li>- Phone: business % of total bill</li>
                    <li>- Office furniture depreciation</li>
                    <li>- Computer equipment depreciation</li>
                    <li>- Repairs and maintenance (office area)</li>
                  </ul>
                  <p className="mt-2 text-slate-500">Requires detailed records of all costs</p>
                </div>
              </div>
            </div>
            <p className="text-slate-600 text-[10px] mt-3">
              ATO reference: ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/deductions-you-can-claim/working-from-home-expenses
            </p>
          </div>

          {/* Common Deductions for Tech/SaaS Business */}
          <div className="bg-base-card rounded-xl border border-slate-800 p-6">
            <h2 className="text-white font-semibold mb-4">Common Deductions for Your Business</h2>
            <p className="text-slate-400 text-sm mb-3">
              As a tech entrepreneur running AI projects (AIG!itch, MasterHQ, etc.), these are typical deductible expenses:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 text-xs uppercase tracking-wider border-b border-slate-800">
                    <th className="p-2">Category</th>
                    <th className="p-2">Examples</th>
                    <th className="p-2">Deductible?</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-800/50">
                    <td className="p-2 text-slate-300 font-medium">Cloud / API costs</td>
                    <td className="p-2 text-slate-400">Anthropic, xAI/Grok, Vercel, DigitalOcean</td>
                    <td className="p-2 text-green-400">100%</td>
                  </tr>
                  <tr className="border-b border-slate-800/50">
                    <td className="p-2 text-slate-300 font-medium">Software subscriptions</td>
                    <td className="p-2 text-slate-400">Claude Max, GitHub, domain names, ImprovMX</td>
                    <td className="p-2 text-green-400">100%</td>
                  </tr>
                  <tr className="border-b border-slate-800/50">
                    <td className="p-2 text-slate-300 font-medium">Internet (Starlink)</td>
                    <td className="p-2 text-slate-400">Monthly Starlink subscription</td>
                    <td className="p-2 text-amber-400">Business % only</td>
                  </tr>
                  <tr className="border-b border-slate-800/50">
                    <td className="p-2 text-slate-300 font-medium">Social media</td>
                    <td className="p-2 text-slate-400">X/Twitter subscription (for marketing)</td>
                    <td className="p-2 text-green-400">100% if business use</td>
                  </tr>
                  <tr className="border-b border-slate-800/50">
                    <td className="p-2 text-slate-300 font-medium">Hardware (under $20k)</td>
                    <td className="p-2 text-slate-400">Laptop, iPad, monitors, keyboard, desk</td>
                    <td className="p-2 text-green-400">Instant asset write-off</td>
                  </tr>
                  <tr className="border-b border-slate-800/50">
                    <td className="p-2 text-slate-300 font-medium">Hardware (over $20k)</td>
                    <td className="p-2 text-slate-400">High-end workstation, server</td>
                    <td className="p-2 text-amber-400">Depreciate over useful life</td>
                  </tr>
                  <tr className="border-b border-slate-800/50">
                    <td className="p-2 text-slate-300 font-medium">Stripe / payment fees</td>
                    <td className="p-2 text-slate-400">Transaction fees on sponsor payments</td>
                    <td className="p-2 text-green-400">100%</td>
                  </tr>
                  <tr className="border-b border-slate-800/50">
                    <td className="p-2 text-slate-300 font-medium">Email / communication</td>
                    <td className="p-2 text-slate-400">Resend, ImprovMX, phone (business %)</td>
                    <td className="p-2 text-green-400">100% or business %</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-slate-300 font-medium">Professional development</td>
                    <td className="p-2 text-slate-400">Courses, books, conferences (tech related)</td>
                    <td className="p-2 text-green-400">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Instant Asset Write-off */}
          <div className="bg-base-card rounded-xl border border-slate-800 p-6">
            <h2 className="text-white font-semibold mb-4">Instant Asset Write-off</h2>
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-3">
              <div className="text-green-400 text-sm font-semibold">Threshold: $20,000 per asset</div>
              <div className="text-green-400/70 text-xs mt-1">
                Small businesses can immediately deduct the full cost of assets under $20,000 in the year of purchase.
                No need to depreciate over multiple years.
              </div>
            </div>
            <div className="text-slate-400 text-sm">
              <p className="mb-2">For your business, this likely covers:</p>
              <ul className="space-y-1 text-xs">
                <li className="flex gap-2"><span className="text-accent">-</span> MacBook / laptop</li>
                <li className="flex gap-2"><span className="text-accent">-</span> iPad</li>
                <li className="flex gap-2"><span className="text-accent">-</span> External monitors</li>
                <li className="flex gap-2"><span className="text-accent">-</span> Desk and office chair</li>
                <li className="flex gap-2"><span className="text-accent">-</span> Keyboard, mouse, accessories</li>
                <li className="flex gap-2"><span className="text-accent">-</span> Headphones, webcam</li>
                <li className="flex gap-2"><span className="text-accent">-</span> Starlink dish (hardware component)</li>
              </ul>
            </div>
          </div>

          {/* Rental Income Notes */}
          <div className="bg-base-card rounded-xl border border-slate-800 p-6">
            <h2 className="text-white font-semibold mb-4">Rental Income — Tax Impact</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Your rental income (2 tenants)</span>
                <span className="text-green-400 font-medium">$23,400/year</span>
              </div>
              <div className="text-slate-400 text-xs space-y-1">
                <p>Rental income is added to your total assessable income. You can deduct rental expenses such as:</p>
                <ul className="mt-2 space-y-1">
                  <li className="flex gap-2"><span className="text-accent">-</span> Council rates (tenant&apos;s share)</li>
                  <li className="flex gap-2"><span className="text-accent">-</span> Water charges (tenant&apos;s share)</li>
                  <li className="flex gap-2"><span className="text-accent">-</span> Insurance (landlord&apos;s share)</li>
                  <li className="flex gap-2"><span className="text-accent">-</span> Repairs and maintenance (tenant areas)</li>
                  <li className="flex gap-2"><span className="text-accent">-</span> Depreciation of furnishings (if furnished)</li>
                </ul>
                <p className="mt-2 text-slate-500">Keep all receipts for rental-related expenses. Your accountant will offset these against rental income.</p>
              </div>
            </div>
          </div>

          {/* GST Note */}
          <div className="bg-base-card rounded-xl border border-slate-800 p-6">
            <h2 className="text-white font-semibold mb-4">GST — Do You Need to Register?</h2>
            <div className="bg-black/20 rounded-lg p-4">
              <div className="text-slate-400 text-sm">
                <p className="mb-2">
                  You must register for GST if your business turnover (not profit) is <strong className="text-white">$75,000 or more</strong> per year.
                </p>
                <p className="mb-2">
                  Rental income is generally <strong className="text-white">not included</strong> in the GST turnover threshold
                  (residential rent is input-taxed, not subject to GST).
                </p>
                <p>
                  If your business income (sponsor payments, etc.) is under $75,000/year, GST registration is <strong className="text-green-400">optional</strong>.
                  Your accountant can advise whether voluntary registration benefits you.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
