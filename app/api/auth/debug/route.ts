import { NextResponse } from "next/server";

// Temporary debug — DELETE after auth is fixed
export async function GET() {
  const mId = process.env.MASTER_GOOGLE_CLIENT_ID;
  const mSecret = process.env.MASTER_GOOGLE_CLIENT_SECRET;
  const gId = process.env.GOOGLE_CLIENT_ID;
  const gSecret = process.env.GOOGLE_CLIENT_SECRET;
  const resolved = {
    id: mId || gId || "",
    secret: mSecret || gSecret || "",
  };

  return NextResponse.json({
    MASTER_GOOGLE_CLIENT_ID: mId ? `SET (${mId.length} chars)` : "NOT SET",
    MASTER_GOOGLE_CLIENT_SECRET: mSecret ? `SET (${mSecret.length} chars)` : "NOT SET",
    GOOGLE_CLIENT_ID: gId ? `SET (${gId.length} chars)` : "NOT SET",
    GOOGLE_CLIENT_SECRET: gSecret ? `SET (${gSecret.length} chars)` : "NOT SET",
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "SET" : "NOT SET",
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || "NOT SET",
    ALLOWED_EMAIL: process.env.ALLOWED_EMAIL || "NOT SET",
    resolvedSource: mId ? "MASTER_GOOGLE_*" : gId ? "GOOGLE_*" : "NONE",
    resolvedIdLength: resolved.id.length,
    resolvedSecretLength: resolved.secret.length,
  });
}
