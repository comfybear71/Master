import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

// GET — list transactions with filters and summaries
// Query params: ?type=income|expense&category=X&from=YYYY-MM-DD&to=YYYY-MM-DD&limit=200
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // "income" or "expense"
    const category = searchParams.get("category");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const limit = parseInt(searchParams.get("limit") || "200");

    const db = await getDb();

    // Build query filter
    const filter: Record<string, unknown> = {};
    if (type) filter.type = type;
    if (category) filter.categoryId = category;
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

    // Calculate summaries
    const summaryPipeline = [
      { $match: filter },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ];
    const summaryResult = await db
      .collection("accounting_transactions")
      .aggregate(summaryPipeline)
      .toArray();

    const income = summaryResult.find((s) => s._id === "income");
    const expense = summaryResult.find((s) => s._id === "expense");

    return NextResponse.json({
      transactions,
      summary: {
        totalIncome: income?.total || 0,
        incomeCount: income?.count || 0,
        totalExpenses: expense?.total || 0,
        expenseCount: expense?.count || 0,
        netProfit: (income?.total || 0) - (expense?.total || 0),
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
    const { type, amount, date, description, categoryId, invoiceId, notes } =
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

    const transaction = {
      type,
      amount: parseFloat(amount),
      date,
      description: description || "",
      categoryId: categoryId || null,
      invoiceId: invoiceId || null,
      currency: "AUD",
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
