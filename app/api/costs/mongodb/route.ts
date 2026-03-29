import { NextResponse } from "next/server";

export async function GET() {
  const publicKey = process.env.MONGODB_ATLAS_PUBLIC_KEY;
  const privateKey = process.env.MONGODB_ATLAS_PRIVATE_KEY;
  const orgId = process.env.MONGODB_ATLAS_ORG_ID;

  if (!publicKey || !privateKey) {
    return NextResponse.json({ error: "MONGODB_ATLAS keys not configured" }, { status: 200 });
  }
  if (!orgId) {
    return NextResponse.json({ error: "MONGODB_ATLAS_ORG_ID not configured" }, { status: 200 });
  }

  try {
    // Atlas Admin API uses Digest auth — we use Basic auth with public:private key
    const credentials = Buffer.from(`${publicKey}:${privateKey}`).toString("base64");

    // Get pending invoice for current billing period
    const res = await fetch(
      `https://cloud.mongodb.com/api/atlas/v2/orgs/${orgId}/invoices/pending`,
      {
        headers: {
          Authorization: `Digest ${credentials}`,
          Accept: "application/vnd.atlas.2023-11-15+json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      }
    );

    if (res.status === 401) {
      // Digest auth requires a challenge-response — try Basic auth
      const basicRes = await fetch(
        `https://cloud.mongodb.com/api/atlas/v2/orgs/${orgId}/invoices/pending`,
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            Accept: "application/vnd.atlas.2023-11-15+json",
          },
          cache: "no-store",
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!basicRes.ok) {
        const text = await basicRes.text();
        return NextResponse.json(
          { error: `MongoDB Atlas API error: ${basicRes.status} ${text.slice(0, 200)}` },
          { status: 200 }
        );
      }

      const data = await basicRes.json();
      const totalCost = data.amountBilledCents
        ? data.amountBilledCents / 100
        : data.subtotalCents
          ? data.subtotalCents / 100
          : 0;

      return NextResponse.json({
        cost: totalCost,
        currency: "USD",
        lastFetched: new Date().toISOString(),
      });
    }

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `MongoDB Atlas API error: ${res.status} ${text.slice(0, 200)}` },
        { status: 200 }
      );
    }

    const data = await res.json();
    const totalCost = data.amountBilledCents
      ? data.amountBilledCents / 100
      : data.subtotalCents
        ? data.subtotalCents / 100
        : 0;

    return NextResponse.json({
      cost: totalCost,
      currency: "USD",
      lastFetched: new Date().toISOString(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `MongoDB Atlas fetch failed: ${msg}` }, { status: 200 });
  }
}
