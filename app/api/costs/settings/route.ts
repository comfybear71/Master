import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

// GET: Retrieve editable cost settings
export async function GET() {
  try {
    const db = await getDb();
    const record = await db.collection("settings").findOne({ key: "cost_settings" });
    return NextResponse.json(record?.values ?? {});
  } catch {
    return NextResponse.json({});
  }
}

// POST: Update an editable cost value
export async function POST(req: NextRequest) {
  try {
    const { service, cost } = await req.json();
    if (!service || typeof cost !== "number" || cost < 0) {
      return NextResponse.json({ error: "Invalid service or cost" }, { status: 400 });
    }

    const db = await getDb();
    await db.collection("settings").updateOne(
      { key: "cost_settings" },
      { $set: { [`values.${service}`]: cost, updatedAt: new Date() } },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
