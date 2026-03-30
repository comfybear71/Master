import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export interface Invoice {
  date: string;
  amount: number;
  type: string;
  status: string;
  ref?: string;
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

// POST: Save invoices for a service
export async function POST(req: NextRequest) {
  try {
    const { service, invoices } = await req.json();
    if (!service || !Array.isArray(invoices)) {
      return NextResponse.json({ error: "Invalid service or invoices" }, { status: 400 });
    }

    const db = await getDb();
    await db.collection("settings").updateOne(
      { key: "cost_invoices" },
      { $set: { [`values.${service}`]: invoices, updatedAt: new Date() } },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
