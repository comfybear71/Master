import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/social/tiktok-manual — get current manual stats
export async function GET() {
  try {
    const db = await getDb();
    const doc = await db.collection("settings").findOne({ key: "tiktok_manual_stats" });
    return NextResponse.json(doc?.value || null);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/social/tiktok-manual — save manual TikTok stats
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = await getDb();

    const stats = {
      followers: Number(body.followers) || 0,
      posts: Number(body.posts) || 0,
      engagementRate: Number(body.engagementRate) || 0,
      adCost: body.adCost || "$0",
      videoViews: body.videoViews || "0",
      newFollowers: Number(body.newFollowers) || 0,
      profileViews: Number(body.profileViews) || 0,
      updatedAt: new Date().toISOString(),
    };

    await db.collection("settings").updateOne(
      { key: "tiktok_manual_stats" },
      { $set: { key: "tiktok_manual_stats", value: stats } },
      { upsert: true }
    );

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
