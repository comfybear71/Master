import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

// GET — list invoices with optional filters
// Query params: ?vendor=X&category=X&status=X&from=YYYY-MM-DD&to=YYYY-MM-DD&limit=50
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const vendor = searchParams.get("vendor");
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const limit = parseInt(searchParams.get("limit") || "100");

    const db = await getDb();

    // Build query filter
    const filter: Record<string, unknown> = {};
    if (vendor) filter.vendor = { $regex: vendor, $options: "i" };
    if (category) filter.categoryId = category;
    if (status) filter.status = status;
    if (from || to) {
      filter.date = {};
      if (from) (filter.date as Record<string, string>).$gte = from;
      if (to) (filter.date as Record<string, string>).$lte = to;
    }

    const invoices = await db
      .collection("accounting_invoices")
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    // Get totals
    const totalPipeline = [
      { $match: { amount: { $ne: null } } },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          totalGst: { $sum: { $ifNull: ["$gstAmount", 0] } },
          count: { $sum: 1 },
        },
      },
    ];
    const totalsResult = await db
      .collection("accounting_invoices")
      .aggregate(totalPipeline)
      .toArray();
    const totals = totalsResult[0] || { totalAmount: 0, totalGst: 0, count: 0 };

    return NextResponse.json({
      invoices,
      totals: {
        amount: totals.totalAmount,
        gst: totals.totalGst,
        count: totals.count,
        displayed: invoices.length,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to fetch invoices";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PATCH — update an invoice (after OCR review, or manual edit)
export async function PATCH(req: NextRequest) {
  try {
    const { id, ...updates } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    // Only allow certain fields to be updated
    const allowedFields = [
      "vendor",
      "categoryId",
      "date",
      "amount",
      "gstAmount",
      "status",
      "notes",
      "ocrStatus",
      "ocrData",
    ];
    const safeUpdates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in updates) {
        safeUpdates[key] = updates[key];
      }
    }
    safeUpdates.updatedAt = new Date().toISOString();

    const db = await getDb();
    const { ObjectId } = await import("mongodb");
    const result = await db
      .collection("accounting_invoices")
      .updateOne({ _id: new ObjectId(id) }, { $set: safeUpdates });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, modified: result.modifiedCount });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to update invoice";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE — delete an invoice
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const db = await getDb();
    const { ObjectId } = await import("mongodb");

    // Get the invoice first to find the blob URL for cleanup
    const invoice = await db
      .collection("accounting_invoices")
      .findOne({ _id: new ObjectId(id) });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Delete the invoice from MongoDB
    await db.collection("accounting_invoices").deleteOne({ _id: new ObjectId(id) });

    // Also delete any transactions linked to this invoice
    const txDeleteResult = await db
      .collection("accounting_transactions")
      .deleteMany({ invoiceId: id });

    // Note: Blob deletion would require del() from @vercel/blob
    // For now we just remove the DB record — blob files persist as orphans
    // (safe — they're just using storage, no security issue for private blobs)

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to delete invoice";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
