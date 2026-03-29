import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.XAI_API_KEY;
  const teamId = process.env.XAI_TEAM_ID;

  if (!apiKey) {
    return NextResponse.json({ error: "XAI_API_KEY not configured" }, { status: 200 });
  }
  if (!teamId) {
    return NextResponse.json({ error: "XAI_TEAM_ID not configured" }, { status: 200 });
  }

  try {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startDate = firstOfMonth.toISOString().split("T")[0];
    const endDate = now.toISOString().split("T")[0];

    const res = await fetch(
      `https://management-api.x.ai/v1/billing/teams/${teamId}/usage?start_date=${startDate}&end_date=${endDate}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `xAI API error: ${res.status} ${text.slice(0, 200)}` }, { status: 200 });
    }

    const data = await res.json();

    // Extract total usage cost
    let totalCost = 0;
    if (typeof data.total === "number") {
      totalCost = data.total;
    } else if (typeof data.total_cost === "number") {
      totalCost = data.total_cost;
    } else if (typeof data.usage === "number") {
      totalCost = data.usage;
    } else if (Array.isArray(data.data)) {
      totalCost = data.data.reduce((sum: number, item: { amount?: number; cost?: number }) => {
        return sum + (item.amount ?? item.cost ?? 0);
      }, 0);
    }

    return NextResponse.json({
      cost: totalCost,
      currency: "USD",
      lastFetched: new Date().toISOString(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `xAI fetch failed: ${msg}` }, { status: 200 });
  }
}
