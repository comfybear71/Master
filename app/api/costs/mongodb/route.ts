import { NextResponse } from "next/server";
import { createHash } from "crypto";

// MongoDB Atlas Admin API uses HTTP Digest Authentication
function computeDigestAuth(
  username: string,
  password: string,
  realm: string,
  nonce: string,
  uri: string,
  method: string,
  qop: string,
  nc: string,
  cnonce: string
): string {
  const ha1 = createHash("md5").update(`${username}:${realm}:${password}`).digest("hex");
  const ha2 = createHash("md5").update(`${method}:${uri}`).digest("hex");
  const response = createHash("md5")
    .update(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
    .digest("hex");
  return `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${uri}", qop=${qop}, nc=${nc}, cnonce="${cnonce}", response="${response}"`;
}

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

  const uri = `/api/atlas/v2/orgs/${orgId}/invoices/pending`;
  const url = `https://cloud.mongodb.com${uri}`;

  try {
    // Step 1: Send unauthenticated request to get the Digest challenge
    const challengeRes = await fetch(url, {
      headers: { Accept: "application/vnd.atlas.2023-11-15+json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });

    if (challengeRes.status !== 401) {
      // If we got a non-401 response, try to use it
      if (challengeRes.ok) {
        const data = await challengeRes.json();
        const cost = (data.amountBilledCents ?? data.subtotalCents ?? 0) / 100;
        return NextResponse.json({ cost, currency: "USD", lastFetched: new Date().toISOString() });
      }
      const text = await challengeRes.text();
      return NextResponse.json({ error: `MongoDB Atlas: ${challengeRes.status} ${text.slice(0, 200)}` }, { status: 200 });
    }

    // Step 2: Parse the WWW-Authenticate header for Digest challenge
    const wwwAuth = challengeRes.headers.get("www-authenticate") || "";
    const realmMatch = wwwAuth.match(/realm="([^"]+)"/);
    const nonceMatch = wwwAuth.match(/nonce="([^"]+)"/);
    const qopMatch = wwwAuth.match(/qop="([^"]+)"/);

    if (!realmMatch || !nonceMatch) {
      return NextResponse.json({ error: "MongoDB Atlas: no Digest challenge received" }, { status: 200 });
    }

    const realm = realmMatch[1];
    const nonce = nonceMatch[1];
    const qop = qopMatch ? qopMatch[1].split(",")[0].trim() : "auth";
    const nc = "00000001";
    const cnonce = createHash("md5").update(Date.now().toString()).digest("hex").slice(0, 16);

    // Step 3: Compute Digest response and make authenticated request
    const authHeader = computeDigestAuth(publicKey, privateKey, realm, nonce, uri, "GET", qop, nc, cnonce);

    const authRes = await fetch(url, {
      headers: {
        Authorization: authHeader,
        Accept: "application/vnd.atlas.2023-11-15+json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });

    if (!authRes.ok) {
      const text = await authRes.text();
      return NextResponse.json({ error: `MongoDB Atlas: ${authRes.status} ${text.slice(0, 200)}` }, { status: 200 });
    }

    const data = await authRes.json();
    const cost = (data.amountBilledCents ?? data.subtotalCents ?? 0) / 100;

    return NextResponse.json({
      cost,
      currency: "USD",
      lastFetched: new Date().toISOString(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `MongoDB Atlas fetch failed: ${msg}` }, { status: 200 });
  }
}
