import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.ANTHROPIC_ADMIN_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 200 });
  }

  try {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startingAt = firstOfMonth.toISOString().split("T")[0]; // YYYY-MM-DD
    const endingAt = now.toISOString().split("T")[0];

    const res = await fetch(
      `https://api.anthropic.com/v1/organizations/cost_report?starting_at=${startingAt}&ending_at=${endingAt}`,
      {
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Anthropic API error: ${res.status} ${text.slice(0, 200)}` }, { status: 200 });
    }

    const data = await res.json();

    // Sum all cost amounts from the data array
    let totalCost = 0;
    if (Array.isArray(data.data)) {
      totalCost = data.data.reduce((sum: number, item: { amount?: number; cost?: number }) => {
        return sum + (item.amount ?? item.cost ?? 0);
      }, 0);
    } else if (typeof data.total_cost === "number") {
      totalCost = data.total_cost;
    } else if (typeof data.amount === "number") {
      totalCost = data.amount;
    }

    return NextResponse.json({
      cost: totalCost,
      currency: "USD",
      lastFetched: new Date().toISOString(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Anthropic fetch failed: ${msg}` }, { status: 200 });
  }
}
