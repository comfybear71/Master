import { NextRequest, NextResponse } from "next/server";

// Fetches the ttyd HTML page and extracts the auth token
// This runs server-side on Vercel — no CORS issues
export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    const correctPassword = process.env.TERMINAL_PASSWORD;
    if (!correctPassword || password !== correctPassword) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ttydUrl = process.env.TTYD_URL;
    if (!ttydUrl) {
      return NextResponse.json({ error: "TTYD_URL not configured" }, { status: 500 });
    }

    // Fetch the ttyd HTML page to extract auth token
    const res = await fetch(ttydUrl, {
      headers: { Accept: "text/html" },
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
    });

    const html = await res.text();

    // ttyd embeds auth token in a meta tag or JavaScript
    // Format: <meta name="auth_token" content="TOKEN">
    let authToken: string | null = null;
    const metaMatch = html.match(
      /name=["']auth_token["']\s+content=["']([^"']+)["']/
    );
    if (metaMatch) {
      authToken = metaMatch[1];
    }

    // Also check for token in JavaScript variable assignments
    if (!authToken) {
      const jsMatch = html.match(/auth_token\s*[:=]\s*["']([^"']+)["']/);
      if (jsMatch) authToken = jsMatch[1];
    }

    return NextResponse.json({
      ttydUrl,
      authToken,
      // Whether ttyd appears to require auth
      requiresAuth: authToken !== null,
    });
  } catch (error) {
    console.error("Token fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch token" }, { status: 500 });
  }
}
