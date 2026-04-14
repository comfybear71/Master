import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

// GET — list transactions with filters and summaries
// Query params: ?type=income|expense&category=X&scope=business|personal|shared&from=YYYY-MM-DD&to=YYYY-MM-DD&limit=200
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const category = searchParams.get("category");
    const scope = searchParams.get("scope");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const limit = parseInt(searchParams.get("limit") || "500");

    const db = await getDb();

    const filter: Record<string, unknown> = {};
    if (type) filter.type = type;
    if (category) filter.categoryId = category;
    if (scope) filter.scope = scope;
    if (from || to) {
      filter.date = {};
      if (from) (filter.date as Record<string, string>).$gte = from;
      if (to) (filter.date as Record<string, string>).$lte = to;
    }

    const transactions = await db
      .collection("accounting_transactions")
      .find(filter)
      .sort({ date: -1, createdAt: -1 })
      .limit(limit)
      .toArray();

    // Summary grouped by type AND scope
    const summaryPipeline = [
      { $match: filter },
      {
        $group: {
          _id: { type: "$type", scope: "$scope" },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ];
    const summaryResult = await db
      .collection("accounting_transactions")
      .aggregate(summaryPipeline)
      .toArray();

    // Build per-scope totals
    const scopeTotals = {
      business: { income: 0, expense: 0, incomeCount: 0, expenseCount: 0 },
      personal: { income: 0, expense: 0, incomeCount: 0, expenseCount: 0 },
      shared: { income: 0, expense: 0, incomeCount: 0, expenseCount: 0 },
    };
    for (const r of summaryResult) {
      const s = (r._id.scope || "business") as "business" | "personal" | "shared";
      const t = r._id.type as "income" | "expense";
      if (scopeTotals[s]) {
        if (t === "income") {
          scopeTotals[s].income = r.total;
          scopeTotals[s].incomeCount = r.count;
        } else {
          scopeTotals[s].expense = r.total;
          scopeTotals[s].expenseCount = r.count;
        }
      }
    }

    // Director loan balance: sum of business expenses paidBy=director,
    // minus sum of Director Loan Repayment transactions
    const loanPipeline = [
      { $match: { scope: "business", type: "expense", paidBy: "director" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ];
    const loanExpensesResult = await db
      .collection("accounting_transactions")
      .aggregate(loanPipeline)
      .toArray();
    const loanExpensesTotal = loanExpensesResult[0]?.total || 0;

    // Repayments: find categories named "Director Loan Repayment" and sum their business-expense transactions
    const repaymentCategories = await db
      .collection("accounting_categories")
      .find({ name: { $regex: /director loan repayment/i } })
      .toArray();
    const repaymentCategoryIds = repaymentCategories.map((c) => c._id.toString());
    let loanRepayments = 0;
    if (repaymentCategoryIds.length > 0) {
      const repaymentPipeline = [
        {
          $match: {
            categoryId: { $in: repaymentCategoryIds },
            type: "expense",
            scope: "business",
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ];
      const repaymentResult = await db
        .collection("accounting_transactions")
        .aggregate(repaymentPipeline)
        .toArray();
      loanRepayments = repaymentResult[0]?.total || 0;
    }
    const directorLoanBalance = loanExpensesTotal - loanRepayments;

    // Legacy combined totals (for backwards compat)
    const totalIncome = scopeTotals.business.income + scopeTotals.personal.income + scopeTotals.shared.income;
    const totalExpenses = scopeTotals.business.expense + scopeTotals.personal.expense + scopeTotals.shared.expense;
    const totalIncomeCount = scopeTotals.business.incomeCount + scopeTotals.personal.incomeCount + scopeTotals.shared.incomeCount;
    const totalExpenseCount = scopeTotals.business.expenseCount + scopeTotals.personal.expenseCount + scopeTotals.shared.expenseCount;

    return NextResponse.json({
      transactions,
      summary: {
        // Combined (legacy)
        totalIncome,
        incomeCount: totalIncomeCount,
        totalExpenses,
        expenseCount: totalExpenseCount,
        netProfit: totalIncome - totalExpenses,
        // Per-scope breakdown
        business: {
          income: scopeTotals.business.income,
          expenses: scopeTotals.business.expense,
          netProfit: scopeTotals.business.income - scopeTotals.business.expense,
          incomeCount: scopeTotals.business.incomeCount,
          expenseCount: scopeTotals.business.expenseCount,
        },
        personal: {
          income: scopeTotals.personal.income,
          expenses: scopeTotals.personal.expense,
          netProfit: scopeTotals.personal.income - scopeTotals.personal.expense,
          incomeCount: scopeTotals.personal.incomeCount,
          expenseCount: scopeTotals.personal.expenseCount,
        },
        shared: {
          income: scopeTotals.shared.income,
          expenses: scopeTotals.shared.expense,
          netProfit: scopeTotals.shared.income - scopeTotals.shared.expense,
          incomeCount: scopeTotals.shared.incomeCount,
          expenseCount: scopeTotals.shared.expenseCount,
        },
        // Director loan balance: how much the company owes the director
        // (sum of business expenses paid by director minus any repayments)
        directorLoanBalance,
        directorLoanExpenses: loanExpensesTotal,
        directorLoanRepayments: loanRepayments,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to fetch transactions";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST — create a new transaction (manual entry or auto-created from invoice OCR)
export async function POST(req: NextRequest) {
  try {
    const { type, amount, date, description, categoryId, invoiceId, notes, scope, paidBy } =
      await req.json();

    if (!type || !amount || !date) {
      return NextResponse.json(
        { error: "Missing required fields: type, amount, date" },
        { status: 400 }
      );
    }
    if (type !== "income" && type !== "expense") {
      return NextResponse.json(
        { error: "Type must be 'income' or 'expense'" },
        { status: 400 }
      );
    }
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive number" },
        { status: 400 }
      );
    }

    const db = await getDb();

    const finalScope: "business" | "personal" | "shared" =
      scope === "personal" || scope === "shared" ? scope : "business";
    const finalPaidBy: "director" | "company" = paidBy === "company" ? "company" : "director";

    const transaction = {
      type,
      amount: parseFloat(amount),
      date,
      description: description || "",
      categoryId: categoryId || null,
      invoiceId: invoiceId || null,
      currency: "AUD",
      scope: finalScope,
      paidBy: finalPaidBy,
      notes: notes || null,
      createdAt: new Date().toISOString(),
    };

    const result = await db
      .collection("accounting_transactions")
      .insertOne(transaction);

    return NextResponse.json(
      { ...transaction, _id: result.insertedId },
      { status: 201 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to create transaction";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PATCH — update a transaction
export async function PATCH(req: NextRequest) {
  try {
    const { id, ...updates } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const allowedFields = [
      "type",
      "amount",
      "date",
      "description",
      "categoryId",
      "invoiceId",
      "notes",
      "scope",
      "paidBy",
    ];
    const safeUpdates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in updates) {
        safeUpdates[key] = updates[key];
        if (key === "amount") safeUpdates[key] = parseFloat(updates[key]);
      }
    }
    safeUpdates.updatedAt = new Date().toISOString();

    const db = await getDb();
    const { ObjectId } = await import("mongodb");
    await db
      .collection("accounting_transactions")
      .updateOne({ _id: new ObjectId(id) }, { $set: safeUpdates });

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to update transaction";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE — delete a transaction
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const db = await getDb();
    const { ObjectId } = await import("mongodb");
    await db
      .collection("accounting_transactions")
      .deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to delete transaction";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
