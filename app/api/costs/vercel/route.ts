import { NextResponse } from "next/server";

export async function GET() {
  const token = process.env.VERCEL_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token) {
    return NextResponse.json({ error: "VERCEL_TOKEN not configured" }, { status: 200 });
  }

  try {
    // Try the usage endpoint first (simpler, more reliable)
    const teamParam = teamId ? `?teamId=${teamId}` : "";
    const usageRes = await fetch(
      `https://api.vercel.com/v1/usage${teamParam}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      }
    );

    if (usageRes.ok) {
      const data = await usageRes.json();
      if (typeof data.amount === "number") {
        return NextResponse.json({
          cost: data.amount / 100, // cents to dollars
          currency: "USD",
          lastFetched: new Date().toISOString(),
        });
      }
    }

    // Fallback: try the billing invoices endpoint for current period
    const invoiceRes = await fetch(
      `https://api.vercel.com/v4/billing/invoices${teamParam}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      }
    );

    if (invoiceRes.ok) {
      const data = await invoiceRes.json();
      // Get the most recent/current invoice
      const invoices = Array.isArray(data.invoices) ? data.invoices : Array.isArray(data) ? data : [];
      if (invoices.length > 0) {
        const current = invoices[0];
        const amount = current.total ?? current.amount ?? current.subtotal ?? 0;
        return NextResponse.json({
          cost: typeof amount === "number" && amount > 100 ? amount / 100 : amount,
          currency: "USD",
          lastFetched: new Date().toISOString(),
        });
      }
    }

    // Last fallback: subscription endpoint
    const subRes = await fetch(
      `https://api.vercel.com/v3/billing/plan${teamParam}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      }
    );

    if (subRes.ok) {
      const data = await subRes.json();
      const cost = data.cost ?? data.price ?? data.amount ?? 0;
      return NextResponse.json({
        cost: typeof cost === "number" && cost > 100 ? cost / 100 : cost,
        currency: "USD",
        lastFetched: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { error: "Vercel billing API — check costs at vercel.com/dashboard" },
      { status: 200 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Vercel fetch failed: ${msg}` }, { status: 200 });
  }
}
