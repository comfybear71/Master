import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

// GET — report config status + last run log
// Usage: /api/backup/blob-mirror/status?password=XXX
export async function GET(req: NextRequest) {
  const correct = process.env.TERMINAL_PASSWORD;
  if (!correct) {
    return NextResponse.json(
      { error: "TERMINAL_PASSWORD not configured on server" },
      { status: 500 }
    );
  }
  const { searchParams } = new URL(req.url);
  const password =
    searchParams.get("password") || req.headers.get("x-terminal-password");
  if (password !== correct) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Config status
  const r2Config = {
    R2_ACCOUNT_ID: !!process.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: !!process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: !!process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME || null,
  };

  const blobTokens = {
    BLOB_TOKEN_AIGLITCH_MEDIA: !!process.env.BLOB_TOKEN_AIGLITCH_MEDIA,
    BLOB_TOKEN_PROPFOLIO_DOCS: !!process.env.BLOB_TOKEN_PROPFOLIO_DOCS,
    BLOB_TOKEN_MASTER: !!process.env.BLOB_TOKEN_MASTER,
    BLOB_TOKEN_GRAPHICS_STORE: !!process.env.BLOB_TOKEN_GRAPHICS_STORE,
    BLOB_TOKEN_SHIP_APP: !!process.env.BLOB_TOKEN_SHIP_APP,
  };

  const r2Ready =
    r2Config.R2_ACCOUNT_ID &&
    r2Config.R2_ACCESS_KEY_ID &&
    r2Config.R2_SECRET_ACCESS_KEY &&
    !!r2Config.R2_BUCKET_NAME;

  const configuredStores = Object.entries(blobTokens)
    .filter(([, v]) => v)
    .map(([k]) => k.replace("BLOB_TOKEN_", "").toLowerCase().replace(/_/g, "-"));

  // Last run from DB
  let lastRun = null;
  try {
    const db = await getDb();
    const doc = await db
      .collection("settings")
      .findOne({ key: "blob_backup_log" });
    if (doc) {
      lastRun = {
        at: doc.lastRun,
        dryRun: doc.dryRun,
        storeFilter: doc.storeFilter,
        totals: doc.totals,
        storeCount: doc.results?.length || 0,
      };
    }
  } catch (err) {
    // ignore
  }

  return NextResponse.json({
    ready: r2Ready,
    r2Config,
    blobTokens,
    configuredStores,
    lastRun,
    usage: {
      run: "/api/backup/blob-mirror?password=XXX",
      dryRun: "/api/backup/blob-mirror?password=XXX&dryRun=true",
      singleStore: "/api/backup/blob-mirror?password=XXX&store=aiglitch-media",
      status: "/api/backup/blob-mirror/status?password=XXX",
    },
    docs: "https://github.com/comfybear71/Master/blob/master/docs/code-preservation-protocol.md#layer-7--vercel-blob-backup",
  });
}
