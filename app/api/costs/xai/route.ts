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

    // Try multiple endpoint patterns
    const endpoints = [
      `https://api.x.ai/v1/usage?team_id=${teamId}&start_date=${startDate}&end_date=${endDate}`,
      `https://api.x.ai/v1/billing/usage?team_id=${teamId}&start_date=${startDate}&end_date=${endDate}`,
      `https://console.x.ai/api/usage?team_id=${teamId}&start_date=${startDate}&end_date=${endDate}`,
    ];

    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/json",
          },
          cache: "no-store",
          signal: AbortSignal.timeout(10000),
        });

        if (res.ok) {
          const data = await res.json();
          let totalCost = 0;
          if (typeof data.total === "number") totalCost = data.total;
          else if (typeof data.total_cost === "number") totalCost = data.total_cost;
          else if (typeof data.usage === "number") totalCost = data.usage;
          else if (typeof data.amount === "number") totalCost = data.amount;
          else if (Array.isArray(data.data)) {
            totalCost = data.data.reduce(
              (sum: number, item: { amount?: number; cost?: number; total?: number }) =>
                sum + (item.amount ?? item.cost ?? item.total ?? 0),
              0
            );
          }
          // Convert cents to dollars if value seems too large
          if (totalCost > 1000) totalCost = totalCost / 100;

          return NextResponse.json({
            cost: totalCost,
            currency: "USD",
            lastFetched: new Date().toISOString(),
          });
        }
      } catch {
        continue;
      }
    }

    // No endpoint worked
    return NextResponse.json(
      { error: "xAI billing API — check costs at console.x.ai" },
      { status: 200 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `xAI fetch failed: ${msg}` }, { status: 200 });
  }
}
