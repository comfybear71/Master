import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One-time endpoint to update prospect emails
// Visit: /api/prospects/update-emails to execute
export async function GET() {
  try {
    const db = await getDb();
    const updates = [
      { id: "69c5651bb485ef8787472573", email: "partners@surfshark.com", company: "Surfshark" },
      { id: "69c5651bb485ef8787472572", email: "partnerships@expressvpn.com", company: "ExpressVPN" },
      { id: "69c56520b485ef878747257f", email: "partnerships@fiverr.com", company: "Fiverr" },
      { id: "69c5651eb485ef878747257b", email: "partnerships@canva.com", company: "Canva" },
      { id: "69c56519b485ef878747256d", email: "hello@magicspoon.com", company: "Magic Spoon" },
      { id: "69c5651cb485ef8787472576", email: "partnerships@skillshare.com", company: "Skillshare" },
      { id: "69c5651cb485ef8787472575", email: "partnerships@makenotion.com", company: "Notion" },
      { id: "69c5651cb485ef8787472574", email: "partnerships@grammarly.com", company: "Grammarly" },
    ];

    const results = [];
    for (const u of updates) {
      const result = await db.collection("prospects").updateOne(
        { _id: new ObjectId(u.id) },
        { $set: { email: u.email } }
      );
      results.push({ company: u.company, email: u.email, matched: result.matchedCount, modified: result.modifiedCount });
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
