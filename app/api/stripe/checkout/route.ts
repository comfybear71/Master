import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://masterhq.dev";

export async function POST(req: NextRequest) {
  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

    const priceMap: Record<string, string> = {
      glitch: process.env.STRIPE_PRICE_GLITCH || "",
      chaos: process.env.STRIPE_PRICE_CHAOS || "",
    };

    const { tier, company, email } = await req.json();

    if (!tier || !priceMap[tier]) {
      return NextResponse.json({ error: "Invalid tier. Use 'glitch' or 'chaos'." }, { status: 400 });
    }

    const priceId = priceMap[tier];
    if (!priceId) {
      return NextResponse.json({ error: `Price ID not configured for ${tier} tier. Set STRIPE_PRICE_${tier.toUpperCase()} env var.` }, { status: 500 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "payment",
      success_url: `${SITE_URL}/sponsor-onboarding.html?payment=success&tier=${tier}`,
      cancel_url: `${SITE_URL}/sponsor-onboarding.html?payment=cancelled`,
      customer_email: email || undefined,
      metadata: {
        tier,
        company: company || "Unknown",
        source: "sponsor-onboarding",
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stripe checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
