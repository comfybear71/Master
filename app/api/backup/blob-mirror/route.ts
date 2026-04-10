import { NextRequest, NextResponse } from "next/server";
import { list } from "@vercel/blob";
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes — Blob mirroring can take a while

// Stores to mirror. Each needs a read-write token in env vars.
// Structure: { storeName → envVarName }
// budju-blob is intentionally excluded (legacy project, being deleted per user instruction 2026-04-10)
const STORES: Array<{ name: string; tokenEnv: string; description: string }> = [
  {
    name: "aiglitch-media",
    tokenEnv: "BLOB_TOKEN_AIGLITCH_MEDIA",
    description: "AIG!itch media (AI videos, NFTs, ads, sponsor uploads)",
  },
  {
    name: "propfolio-docs",
    tokenEnv: "BLOB_TOKEN_PROPFOLIO_DOCS",
    description: "Propfolio private documents (payslips, statements, certificates) — IRREPLACEABLE",
  },
  {
    name: "master",
    tokenEnv: "BLOB_TOKEN_MASTER",
    description: "MasterHQ Blob (misc uploads)",
  },
  {
    name: "graphics-store",
    tokenEnv: "BLOB_TOKEN_GRAPHICS_STORE",
    description: "Graphics store (brand assets, logos)",
  },
  {
    name: "ship-app",
    tokenEnv: "BLOB_TOKEN_SHIP_APP",
    description: "Ship-app Blob (to be documented)",
  },
];

interface StoreResult {
  store: string;
  files: number;
  uploaded: number;
  skipped: number;
  bytes: number;
  errors: Array<{ pathname: string; error: string }>;
  durationMs: number;
  dryRun: boolean;
}

interface SkipResult {
  store: string;
  skipped: true;
  reason: string;
}

// Accepts either:
//  - TERMINAL_PASSWORD via ?password=XXX or x-terminal-password header (manual runs)
//  - CRON_SECRET via Authorization: Bearer XXX (Vercel Cron auto-adds this)
function authCheck(req: NextRequest): NextResponse | null {
  const terminalPass = process.env.TERMINAL_PASSWORD;
  const cronSecret = process.env.CRON_SECRET;

  if (!terminalPass && !cronSecret) {
    return NextResponse.json(
      { error: "Neither TERMINAL_PASSWORD nor CRON_SECRET configured on server" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const providedPassword =
    searchParams.get("password") || req.headers.get("x-terminal-password");
  const authHeader = req.headers.get("authorization");
  const providedCron = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  const terminalOk = terminalPass && providedPassword === terminalPass;
  const cronOk = cronSecret && providedCron === cronSecret;

  if (!terminalOk && !cronOk) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

function makeR2Client(): { client: S3Client; bucket: string } | { error: string } {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    return {
      error:
        "R2 env vars missing. Need: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME",
    };
  }

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  return { client, bucket };
}

async function mirrorStore(
  storeName: string,
  token: string,
  s3: S3Client,
  bucket: string,
  dryRun: boolean
): Promise<StoreResult> {
  const start = Date.now();
  const result: StoreResult = {
    store: storeName,
    files: 0,
    uploaded: 0,
    skipped: 0,
    bytes: 0,
    errors: [],
    durationMs: 0,
    dryRun,
  };

  let cursor: string | undefined;
  do {
    const listRes = await list({ token, cursor, limit: 1000 });

    for (const blob of listRes.blobs) {
      result.files++;
      const key = `${storeName}/${blob.pathname}`;

      // Check if the file is already in R2 with the same size — skip if so.
      // This makes the job idempotent and cheap to re-run weekly.
      try {
        const head = await s3.send(
          new HeadObjectCommand({ Bucket: bucket, Key: key })
        );
        if (head.ContentLength === blob.size) {
          result.skipped++;
          continue;
        }
      } catch {
        // Not in R2 yet — proceed to upload
      }

      if (dryRun) {
        result.uploaded++; // would be uploaded
        result.bytes += blob.size;
        continue;
      }

      try {
        const response = await fetch(blob.url);
        if (!response.ok) {
          throw new Error(`Fetch failed: ${response.status}`);
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        const contentType =
          response.headers.get("content-type") || "application/octet-stream";

        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: buffer,
            ContentType: contentType,
          })
        );

        result.uploaded++;
        result.bytes += buffer.byteLength;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push({ pathname: blob.pathname, error: msg });
      }
    }

    cursor = listRes.cursor;
  } while (cursor);

  result.durationMs = Date.now() - start;
  return result;
}

// GET — run the backup (or preview with ?dryRun=true)
// Query params:
//   password=XXX            — required (TERMINAL_PASSWORD)
//   dryRun=true             — preview without uploading
//   store=aiglitch-media    — optional, run a single store
export async function GET(req: NextRequest) {
  const authErr = authCheck(req);
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const dryRun = searchParams.get("dryRun") === "true";
  const storeFilter = searchParams.get("store");

  const r2 = makeR2Client();
  if ("error" in r2) {
    return NextResponse.json({ error: r2.error }, { status: 500 });
  }
  const { client: s3, bucket } = r2;

  const storesToRun = storeFilter
    ? STORES.filter((s) => s.name === storeFilter)
    : STORES;

  if (storesToRun.length === 0) {
    return NextResponse.json(
      { error: `No store matches filter: ${storeFilter}` },
      { status: 400 }
    );
  }

  const results: Array<StoreResult | SkipResult> = [];

  for (const store of storesToRun) {
    const token = process.env[store.tokenEnv];
    if (!token) {
      results.push({
        store: store.name,
        skipped: true,
        reason: `${store.tokenEnv} not configured in env vars`,
      });
      continue;
    }

    try {
      const result = await mirrorStore(store.name, token, s3, bucket, dryRun);
      results.push(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({
        store: store.name,
        skipped: true,
        reason: `mirror crashed: ${msg}`,
      });
    }
  }

  // Totals
  const totals = results.reduce(
    (acc, r) => {
      if ("files" in r) {
        acc.files += r.files;
        acc.uploaded += r.uploaded;
        acc.skipped += r.skipped;
        acc.bytes += r.bytes;
        acc.errors += r.errors.length;
      }
      return acc;
    },
    { files: 0, uploaded: 0, skipped: 0, bytes: 0, errors: 0 }
  );

  // Log to MongoDB for audit trail
  try {
    const db = await getDb();
    await db.collection("settings").updateOne(
      { key: "blob_backup_log" },
      {
        $set: {
          key: "blob_backup_log",
          lastRun: new Date(),
          dryRun,
          storeFilter: storeFilter || null,
          totals,
          results,
        },
      },
      { upsert: true }
    );
  } catch (err) {
    // Non-fatal — log the mirror succeeded even if DB write failed
    console.error("Failed to log backup run to MongoDB:", err);
  }

  return NextResponse.json({
    summary: dryRun
      ? `DRY RUN: would mirror ${totals.uploaded} files (${formatBytes(totals.bytes)}) across ${results.length} stores`
      : `Mirrored ${totals.uploaded} files (${formatBytes(totals.bytes)}) across ${results.length} stores. ${totals.skipped} already up-to-date. ${totals.errors} errors.`,
    dryRun,
    totals,
    results,
    docs: "https://github.com/comfybear71/Master/blob/master/docs/code-preservation-protocol.md",
  });
}

// GET without running — just show config status
// Usage: /api/backup/blob-mirror?password=XXX&status=true
export async function POST() {
  return NextResponse.json(
    { error: "Use GET. This endpoint is read-only." },
    { status: 405 }
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
