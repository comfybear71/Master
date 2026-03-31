import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Temporary endpoint to fix sponsor data in MongoDB
// DELETE THIS FILE after fixing the BUDJU record
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  try {
    const db = await getDb();

    if (action === "fix-budju") {
      // Fix the Unknown company name to BUDJU
      const result = await db.collection("sponsor_uploads").updateMany(
        { company: "Unknown" },
        { $set: { company: "BUDJU", email: "contact@budju.xyz" } }
      );
      return NextResponse.json({ success: true, modified: result.modifiedCount });
    }

    // Default: show all sponsor uploads
    const uploads = await db.collection("sponsor_uploads").find({}).toArray();
    return NextResponse.json({ uploads });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
