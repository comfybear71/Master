import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export interface Invoice {
  date: string;
  amount: number;
  description?: string;
}

// GET: Retrieve all invoice histories
export async function GET() {
  try {
    const db = await getDb();
    const record = await db.collection("settings").findOne({ key: "cost_invoices" });
    return NextResponse.json(record?.values ?? {});
  } catch {
    return NextResponse.json({});
  }
}

// POST: Add a single invoice to a service, or replace all invoices for a service
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { service } = body;

    if (!service) {
      return NextResponse.json({ error: "Missing service" }, { status: 400 });
    }

    // If "invoices" array provided, replace all invoices for this service (legacy/bulk)
    if (Array.isArray(body.invoices)) {
      const db = await getDb();
      await db.collection("settings").updateOne(
        { key: "cost_invoices" },
        { $set: { [`values.${service}`]: body.invoices, updatedAt: new Date() } },
        { upsert: true }
      );
      return NextResponse.json({ success: true });
    }

    // Otherwise, add a single invoice
    const { date, amount, description } = body;
    if (!date || typeof amount !== "number" || amount < 0) {
      return NextResponse.json({ error: "Invalid date or amount" }, { status: 400 });
    }

    const invoice: Invoice = { date, amount };
    if (description) invoice.description = description;

    const db = await getDb();
    // Get existing invoices
    const record = await db.collection("settings").findOne({ key: "cost_invoices" });
    const existing: Invoice[] = record?.values?.[service] ?? [];

    // Add new invoice and sort by date descending (newest first)
    existing.push(invoice);
    existing.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    await db.collection("settings").updateOne(
      { key: "cost_invoices" },
      { $set: { [`values.${service}`]: existing, updatedAt: new Date() } },
      { upsert: true }
    );

    // Also update the cost_settings total to match invoice sum
    const total = existing.reduce((sum, inv) => sum + inv.amount, 0);
    await db.collection("settings").updateOne(
      { key: "cost_settings" },
      { $set: { [`values.${service}`]: total, updatedAt: new Date() } },
      { upsert: true }
    );

    return NextResponse.json({ success: true, invoices: existing, total });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE: Remove a single invoice by index
export async function DELETE(req: NextRequest) {
  try {
    const { service, index } = await req.json();
    if (!service || typeof index !== "number") {
      return NextResponse.json({ error: "Missing service or index" }, { status: 400 });
    }

    const db = await getDb();
    const record = await db.collection("settings").findOne({ key: "cost_invoices" });
    const existing: Invoice[] = record?.values?.[service] ?? [];

    if (index < 0 || index >= existing.length) {
      return NextResponse.json({ error: "Invalid index" }, { status: 400 });
    }

    existing.splice(index, 1);

    await db.collection("settings").updateOne(
      { key: "cost_invoices" },
      { $set: { [`values.${service}`]: existing, updatedAt: new Date() } },
      { upsert: true }
    );

    // Update the cost_settings total
    const total = existing.reduce((sum, inv) => sum + inv.amount, 0);
    await db.collection("settings").updateOne(
      { key: "cost_settings" },
      { $set: { [`values.${service}`]: total, updatedAt: new Date() } },
      { upsert: true }
    );

    return NextResponse.json({ success: true, invoices: existing, total });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
