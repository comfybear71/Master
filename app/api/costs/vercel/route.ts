import { NextResponse } from "next/server";

export async function GET() {
  const token = process.env.VERCEL_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token) {
    return NextResponse.json({ error: "VERCEL_TOKEN not configured" }, { status: 200 });
  }

  try {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const from = firstOfMonth.toISOString();
    const to = now.toISOString();

    const url = teamId
      ? `https://api.vercel.com/v1/billing/charges?teamId=${teamId}&from=${from}&to=${to}`
      : `https://api.vercel.com/v1/billing/charges?from=${from}&to=${to}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Vercel API error: ${res.status} ${text}` }, { status: 200 });
    }

    const text = await res.text();

    // Response may be JSONL (one JSON object per line) or a JSON array
    let totalCost = 0;
    try {
      // Try parsing as JSON array first
      const arr = JSON.parse(text);
      if (Array.isArray(arr)) {
        totalCost = arr.reduce((sum: number, item: { BilledCost?: number; billedCost?: number; amount?: number }) => {
          return sum + (item.BilledCost ?? item.billedCost ?? item.amount ?? 0);
        }, 0);
      }
    } catch {
      // Parse as JSONL — each line is a separate JSON object
      const lines = text.split("\n").filter((l) => l.trim());
      for (const line of lines) {
        try {
          const obj = JSON.parse(line);
          totalCost += obj.BilledCost ?? obj.billedCost ?? obj.amount ?? 0;
        } catch {
          // Skip unparseable lines
        }
      }
    }

    return NextResponse.json({
      cost: Math.abs(totalCost),
      currency: "USD",
      lastFetched: new Date().toISOString(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Vercel fetch failed: ${msg}` }, { status: 200 });
  }
}
