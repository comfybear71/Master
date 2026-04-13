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

const COOKIE_NAME = "masterhq_session";
const SESSION_MAX_AGE = 7 * 24 * 60 * 60;

function encrypt(text: string): string {
  const key = crypto.createHash("sha256").update(AUTH_SECRET()).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${error}`, req.url));
  }
  if (!code) {
    return NextResponse.redirect(new URL("/login?error=no_code", req.url));
  }

  const cookieStore = await cookies();
  const savedState = cookieStore.get("oauth_state")?.value;
  if (!savedState || savedState !== state) {
    return NextResponse.redirect(new URL("/login?error=state_mismatch", req.url));
  }
  cookieStore.delete("oauth_state");

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID(),
      client_secret: GOOGLE_CLIENT_SECRET(),
      redirect_uri: REDIRECT_URI(),
      grant_type: "authorization_code",
    }),
  });

  const tokenData = await tokenResponse.json();

  if (!tokenResponse.ok) {
    console.error("[AUTH] Token exchange failed:", JSON.stringify(tokenData));
    const detail = tokenData.error_description || tokenData.error || "unknown";
    return NextResponse.redirect(
      new URL(`/login?error=token_failed&detail=${encodeURIComponent(detail)}`, req.url)
    );
  }

  const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  if (!userInfoRes.ok) {
    return NextResponse.redirect(new URL("/login?error=userinfo_failed", req.url));
  }
  const userInfo = await userInfoRes.json();

  const allowed = ALLOWED_EMAIL();
  if (allowed && userInfo.email?.toLowerCase() !== allowed.toLowerCase()) {
    return NextResponse.redirect(new URL("/login?error=AccessDenied", req.url));
  }

  const session = encrypt(JSON.stringify({
    email: userInfo.email,
    name: userInfo.name,
    picture: userInfo.picture,
    loggedInAt: new Date().toISOString(),
  }));

  const response = NextResponse.redirect(new URL("/", req.url));
  response.cookies.set(COOKIE_NAME, session, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
  return response;
}
