import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

/**
 * GET /api/auth/callback/google
 * Google OAuth2 callback — exchanges the auth code for tokens and stores them in MongoDB.
 *
 * Flow:
 * 1. User visits /api/auth/google -> redirected to Google consent screen
 * 2. Google redirects here with ?code=...
 * 3. We exchange the code for access_token + refresh_token
 * 4. Store both in MongoDB `oauth_tokens` collection (provider: "google_youtube")
 * 5. Show success page or redirect to dashboard
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  // Handle user denying consent
  if (error) {
    console.error("[Google OAuth Callback] User denied consent:", error);
    return new NextResponse(
      buildHtmlPage(
        "Authorization Denied",
        `Google OAuth was denied: ${error}. <a href="/api/auth/google">Try again</a>.`,
        "error"
      ),
      { status: 400, headers: { "Content-Type": "text/html" } }
    );
  }

  if (!code) {
    console.error("[Google OAuth Callback] No code parameter in callback URL");
    return new NextResponse(
      buildHtmlPage(
        "Missing Authorization Code",
        'No authorization code received from Google. <a href="/api/auth/google">Try again</a>.',
        "error"
      ),
      { status: 400, headers: { "Content-Type": "text/html" } }
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("[Google OAuth Callback] Missing env vars:", {
      GOOGLE_CLIENT_ID: !!clientId,
      GOOGLE_CLIENT_SECRET: !!clientSecret,
    });
    return new NextResponse(
      buildHtmlPage(
        "Server Configuration Error",
        "GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set in environment variables.",
        "error"
      ),
      { status: 500, headers: { "Content-Type": "text/html" } }
    );
  }

  // Build the same redirect_uri used in /api/auth/google
  const baseUrl = process.env.NEXTAUTH_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const redirectUri = `${baseUrl}/api/auth/callback/google`;

  console.log("[Google OAuth Callback] Exchanging code for tokens");
  console.log("[Google OAuth Callback]   redirect_uri:", redirectUri);
  console.log("[Google OAuth Callback]   code length:", code.length);

  try {
    // Exchange authorization code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenText = await tokenRes.text();
    console.log("[Google OAuth Callback] Token exchange status:", tokenRes.status);
    console.log("[Google OAuth Callback] Token exchange response:", tokenText.slice(0, 400));

    if (!tokenRes.ok) {
      console.error("[Google OAuth Callback] Token exchange failed:", tokenRes.status, tokenText.slice(0, 400));
      return new NextResponse(
        buildHtmlPage(
          "Token Exchange Failed",
          `Google returned ${tokenRes.status}: ${tokenText.slice(0, 200)}. <a href="/api/auth/google">Try again</a>.`,
          "error"
        ),
        { status: 502, headers: { "Content-Type": "text/html" } }
      );
    }

    const tokenData = JSON.parse(tokenText) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      token_type?: string;
      scope?: string;
    };

    if (!tokenData.access_token) {
      console.error("[Google OAuth Callback] No access_token in response:", tokenText.slice(0, 200));
      return new NextResponse(
        buildHtmlPage(
          "No Access Token",
          'Google did not return an access token. <a href="/api/auth/google">Try again</a>.',
          "error"
        ),
        { status: 502, headers: { "Content-Type": "text/html" } }
      );
    }

    // Store tokens in MongoDB oauth_tokens collection
    const db = await getDb();
    const now = new Date();
    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000);

    const updateDoc: Record<string, unknown> = {
      provider: "google_youtube",
      access_token: tokenData.access_token,
      expires_at: expiresAt,
      updated_at: now,
    };

    // refresh_token is only returned on the first authorization or when prompt=consent is used
    if (tokenData.refresh_token) {
      updateDoc.refresh_token = tokenData.refresh_token;
    }

    await db.collection("oauth_tokens").updateOne(
      { provider: "google_youtube" },
      { $set: updateDoc },
      { upsert: true }
    );

    console.log("[Google OAuth Callback] Tokens stored in MongoDB oauth_tokens");
    console.log("[Google OAuth Callback]   access_token: yes");
    console.log("[Google OAuth Callback]   refresh_token:", tokenData.refresh_token ? "yes (stored)" : "no (not in response, keeping existing)");
    console.log("[Google OAuth Callback]   expires_at:", expiresAt.toISOString());
    console.log("[Google OAuth Callback]   scope:", tokenData.scope || "(not reported)");

    return new NextResponse(
      buildHtmlPage(
        "YouTube Authorization Successful",
        `<p>Google OAuth tokens have been stored successfully.</p>
         <ul>
           <li>Access token: stored</li>
           <li>Refresh token: ${tokenData.refresh_token ? "stored" : "not returned (using existing)"}</li>
           <li>Expires at: ${expiresAt.toISOString()}</li>
           <li>Scope: ${tokenData.scope || "(not reported)"}</li>
         </ul>
         <p>YouTube Data API v3 calls will now use these tokens automatically.</p>
         <p><a href="/">Return to Dashboard</a></p>`,
        "success"
      ),
      { status: 200, headers: { "Content-Type": "text/html" } }
    );
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[Google OAuth Callback] Exception:", errMsg);
    return new NextResponse(
      buildHtmlPage(
        "Authorization Error",
        `An error occurred: ${errMsg}. <a href="/api/auth/google">Try again</a>.`,
        "error"
      ),
      { status: 500, headers: { "Content-Type": "text/html" } }
    );
  }
}

/**
 * Build a simple HTML page for the OAuth callback result.
 * Matches TheMaster's dark theme.
 */
function buildHtmlPage(title: string, body: string, status: "success" | "error"): string {
  const accentColor = status === "success" ? "#00ff88" : "#ff4444";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - TheMaster</title>
  <style>
    body {
      background: #0a0f1e;
      color: #e0e0e0;
      font-family: 'Inter', system-ui, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 1rem;
    }
    .card {
      background: #111827;
      border: 1px solid ${accentColor}40;
      border-radius: 12px;
      padding: 2rem;
      max-width: 500px;
      width: 100%;
    }
    h1 {
      color: ${accentColor};
      font-size: 1.5rem;
      margin-top: 0;
    }
    a {
      color: #00d4ff;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    ul {
      padding-left: 1.2rem;
    }
    li {
      margin-bottom: 0.3rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85rem;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    ${body}
  </div>
</body>
</html>`;
}
