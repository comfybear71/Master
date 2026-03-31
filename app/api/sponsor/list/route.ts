import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// GET /api/sponsor/list — returns all paid sponsors with their uploads
// Called by AIG!itch admin to auto-import sponsors
// Optional: ?company=BUDJU to filter by company name
// Optional: ?status=pending to get only un-imported sponsors
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const company = searchParams.get("company");
  const status = searchParams.get("status");

  try {
    const db = await getDb();

    // Get all sponsor uploads
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: Record<string, any> = {};
    if (company) query.company = { $regex: company, $options: "i" };
    if (status === "pending") query.importedToAiglitch = { $ne: true };

    const uploads = await db.collection("sponsor_uploads")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    // Enrich with Stripe payment data if available
    const sponsors = uploads.map((u) => ({
      id: String(u._id),
      company: u.company,
      email: u.email,
      tier: u.tier,
      files: u.files,
      createdAt: u.createdAt,
      importedToAiglitch: u.importedToAiglitch || false,
      // Derive package details from tier
      package: u.tier === "chaos"
        ? { name: "Chaos", price: 100, frequency: 80, placements: 560, duration: 7 }
        : { name: "Glitch", price: 50, frequency: 30, placements: 210, duration: 7 },
    }));

    return NextResponse.json({ sponsors, count: sponsors.length }, { headers: CORS_HEADERS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500, headers: CORS_HEADERS });
  }
}

// POST /api/sponsor/list — mark a sponsor as imported to AIG!itch
export async function POST(req: NextRequest) {
  try {
    const { sponsorId } = await req.json();
    if (!sponsorId) {
      return NextResponse.json({ error: "Missing sponsorId" }, { status: 400, headers: CORS_HEADERS });
    }

    const db = await getDb();
    const { ObjectId } = await import("mongodb");
    await db.collection("sponsor_uploads").updateOne(
      { _id: new ObjectId(sponsorId) },
      { $set: { importedToAiglitch: true, importedAt: new Date().toISOString() } }
    );

    return NextResponse.json({ success: true }, { headers: CORS_HEADERS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500, headers: CORS_HEADERS });
  }
}
