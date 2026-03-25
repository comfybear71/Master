import { NextResponse } from "next/server";

/**
 * GET /api/auth/google
 * Redirects the user to Google's OAuth2 consent screen.
 * After consent, Google redirects back to /api/auth/callback/google with an auth code.
 * Scopes: youtube.readonly + youtube.upload
 */
export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      { error: "GOOGLE_CLIENT_ID not set in environment variables" },
      { status: 500 }
    );
  }

  // Build the redirect URI — same logic used in the callback route
  const baseUrl = process.env.NEXTAUTH_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const redirectUri = `${baseUrl}/api/auth/callback/google`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.upload",
    access_type: "offline",
    prompt: "consent",
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  console.log("[Google OAuth] Redirecting to consent screen");
  console.log("[Google OAuth]   redirect_uri:", redirectUri);

  return NextResponse.redirect(authUrl);
}
