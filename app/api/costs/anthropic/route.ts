import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 200 });
  }

  try {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startingAt = firstOfMonth.toISOString().split("T")[0];
    const endingAt = now.toISOString().split("T")[0];

    // Try the usage endpoint first (most likely to work with standard API key)
    const res = await fetch(
      `https://api.anthropic.com/v1/usage?start_date=${startingAt}&end_date=${endingAt}`,
      {
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      }
    );

    if (res.ok) {
      const data = await res.json();
      let totalCost = 0;
      if (typeof data.total_cost === "number") totalCost = data.total_cost;
      else if (typeof data.amount === "number") totalCost = data.amount;
      else if (Array.isArray(data.data)) {
        totalCost = data.data.reduce((sum: number, item: { amount?: number; cost?: number }) =>
          sum + (item.amount ?? item.cost ?? 0), 0);
      }
      return NextResponse.json({ cost: totalCost, currency: "USD", lastFetched: new Date().toISOString() });
    }

    // If /v1/usage doesn't work, try the billing endpoint
    const billingRes = await fetch(
      `https://api.anthropic.com/v1/organizations/billing?start_date=${startingAt}&end_date=${endingAt}`,
      {
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      }
    );

    if (billingRes.ok) {
      const data = await billingRes.json();
      const totalCost = data.total_cost ?? data.amount ?? 0;
      return NextResponse.json({ cost: totalCost, currency: "USD", lastFetched: new Date().toISOString() });
    }

    // Neither endpoint worked — billing API may not be publicly available
    return NextResponse.json(
      { error: "Anthropic billing API not available — check costs at console.anthropic.com" },
      { status: 200 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Anthropic fetch failed: ${msg}` }, { status: 200 });
  }
}
