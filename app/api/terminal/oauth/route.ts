import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

/**
 * OAuth URL relay for iPad terminal workflow.
 *
 * Flow:
 * 1. Claude Code on droplet shows OAuth URL
 * 2. User presses 'c' — URL goes to droplet clipboard
 * 3. User runs: curl -X POST https://masterhq.dev/api/terminal/oauth -d "url=$(xclip -o)"
 *    OR a helper script does this automatically
 * 4. MasterHQ stores the URL in MongoDB
 * 5. Terminal page polls this endpoint and shows "Open Login" button
 */

export async function GET() {
  try {
    const db = await getDb();
    const entry = await db.collection("terminal_oauth").findOne(
      { createdAt: { $gt: new Date(Date.now() - 5 * 60 * 1000).toISOString() } },
      { sort: { createdAt: -1 } }
    );

    if (entry?.url) {
      return NextResponse.json({ url: entry.url, createdAt: entry.createdAt });
    }

    return NextResponse.json({ url: null });
  } catch {
    return NextResponse.json({ url: null });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const url = body?.url || "";

    if (!url || !url.startsWith("http")) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Fix claude.com to claude.ai
    const fixed = url.replace("https://claude.com/", "https://claude.ai/");

    const db = await getDb();
    // Clear old entries
    await db.collection("terminal_oauth").deleteMany({});
    // Store new URL
    await db.collection("terminal_oauth").insertOne({
      url: fixed,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to store URL" }, { status: 500 });
  }
}
