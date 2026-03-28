import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

// POST: Store an OAuth URL (called from droplet helper script)
export async function POST(req: NextRequest) {
  try {
    const { url, password } = await req.json();

    // Authenticate with terminal password
    const correctPassword = process.env.TERMINAL_PASSWORD;
    if (!correctPassword || password !== correctPassword) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!url || !url.startsWith("https://claude.com/cai/oauth")) {
      return NextResponse.json({ error: "Invalid OAuth URL" }, { status: 400 });
    }

    const db = await getDb();
    await db.collection("settings").updateOne(
      { key: "terminal_oauth_url" },
      {
        $set: {
          key: "terminal_oauth_url",
          url,
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("OAuth URL store error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// GET: Retrieve the latest OAuth URL (polled by terminal page)
export async function GET(req: NextRequest) {
  try {
    const password = req.nextUrl.searchParams.get("password");

    const correctPassword = process.env.TERMINAL_PASSWORD;
    if (!correctPassword || password !== correctPassword) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const record = await db.collection("settings").findOne({ key: "terminal_oauth_url" });

    if (!record?.url || !record?.createdAt) {
      return NextResponse.json({ url: null });
    }

    // Only return URLs less than 10 minutes old
    const age = Date.now() - new Date(record.createdAt).getTime();
    if (age > 10 * 60 * 1000) {
      return NextResponse.json({ url: null });
    }

    return NextResponse.json({ url: record.url });
  } catch (error) {
    console.error("OAuth URL fetch error:", error);
    return NextResponse.json({ url: null });
  }
}

// DELETE: Clear stored OAuth URL
export async function DELETE(req: NextRequest) {
  try {
    const password = req.nextUrl.searchParams.get("password");

    const correctPassword = process.env.TERMINAL_PASSWORD;
    if (!correctPassword || password !== correctPassword) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    await db.collection("settings").deleteOne({ key: "terminal_oauth_url" });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
