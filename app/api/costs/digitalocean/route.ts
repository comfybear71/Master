import { NextResponse } from "next/server";

export async function GET() {
  const token = process.env.DIGITALOCEAN_API_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "DIGITALOCEAN_API_TOKEN not configured" }, { status: 200 });
  }

  try {
    const res = await fetch("https://api.digitalocean.com/v2/customers/my/balance", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `DigitalOcean API error: ${res.status} ${text}` }, { status: 200 });
    }

    const data = await res.json();
    // month_to_date_usage is a string like "-12.34" (negative = charges)
    const usage = Math.abs(parseFloat(data.month_to_date_usage || "0"));

    return NextResponse.json({
      cost: usage,
      currency: "USD",
      lastFetched: new Date().toISOString(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `DigitalOcean fetch failed: ${msg}` }, { status: 200 });
  }
}
