import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as crypto from "crypto";

export const runtime = "nodejs";

const GOOGLE_CLIENT_ID = () =>
  process.env.MASTER_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = () =>
  process.env.MASTER_GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || "";
const REDIRECT_URI = () => {
  const base = (process.env.NEXTAUTH_URL || "https://masterhq.dev").replace(/\/$/, "");
  return `${base}/api/auth/callback/google`;
};
const ALLOWED_EMAIL = () => process.env.ALLOWED_EMAIL || "";
const AUTH_SECRET = () => process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "fallback-dev-secret";

// Session cookie name and max age
const COOKIE_NAME = "masterhq_session";
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

// Encrypt/decrypt session token
function encrypt(text: string): string {
  const key = crypto.createHash("sha256").update(AUTH_SECRET()).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

function decrypt(text: string): string | null {
  try {
    const key = crypto.createHash("sha256").update(AUTH_SECRET()).digest();
    const [ivHex, encrypted] = text.split(":");
    if (!ivHex || !encrypted) return null;
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return null;
  }
}

// GET /api/auth/login — start Google OAuth flow
export async function GET(req: Request) {
  const url = new URL(req.url);
  const action = url.pathname.split("/").pop();

  // === /api/auth/login — redirect to Google ===
  if (action === "login") {
    const state = crypto.randomBytes(16).toString("hex");
    const cookieStore = await cookies();
    cookieStore.set("oauth_state", state, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 300, // 5 minutes
      path: "/",
    });

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID(),
      redirect_uri: REDIRECT_URI(),
      response_type: "code",
      scope: "openid email profile",
      state,
      access_type: "online",
      prompt: "select_account",
    });

    return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  }

  // === /api/auth/session — return current session ===
  if (action === "session") {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(COOKIE_NAME);
    if (!sessionCookie) {
      return NextResponse.json({ authenticated: false });
    }
    const data = decrypt(sessionCookie.value);
    if (!data) {
      return NextResponse.json({ authenticated: false });
    }
    try {
      const session = JSON.parse(data);
      return NextResponse.json({ authenticated: true, user: session });
    } catch {
      return NextResponse.json({ authenticated: false });
    }
  }

  // === /api/auth/logout — clear session ===
  if (action === "logout") {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.json({ error: "Unknown auth action" }, { status: 400 });
}
