import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { generateSponsorEmail } from "@/lib/ai";
import { Resend } from "resend";

export async function GET() {
  try {
    const db = await getDb();
    const emails = await db
      .collection("outreach_emails")
      .find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();
    return NextResponse.json(emails);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch emails";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  try {
    if (action === "generate") {
      const { companyName, industry, productDescription, tone, contactEmail } = await req.json();
      if (!companyName || !industry) {
        return NextResponse.json({ error: "Missing companyName or industry" }, { status: 400 });
      }

      // Get current social stats for the email
      const db = await getDb();
      const statsData = await db.collection("social_stats").find({}).toArray();
      const platforms = statsData.map((s) => ({
        name: s.platform as string,
        followers: (s.followers as number) || 0,
        posts: (s.posts as number) || 0,
      }));
      const totalFollowers = platforms.reduce((sum, p) => sum + p.followers, 0);

      const result = await generateSponsorEmail(
        companyName,
        industry,
        productDescription || "",
        tone || "casual",
        { totalFollowers, platforms }
      );

      // Save to DB
      const email = {
        companyName,
        industry,
        productDescription: productDescription || "",
        contactEmail: contactEmail || "",
        tone: tone || "casual",
        ...result,
        status: "draft" as const,
        createdAt: new Date().toISOString(),
      };

      const insertResult = await db.collection("outreach_emails").insertOne(email);

      return NextResponse.json({
        ...email,
        _id: insertResult.insertedId,
      }, { status: 201 });
    }

    if (action === "send") {
      const { emailId, subject, body, toEmail, companyName, tone, persona } = await req.json();
      if (!toEmail || !subject || !body) {
        return NextResponse.json({ error: "Missing toEmail, subject, or body" }, { status: 400 });
      }

      const resendKey = process.env.RESEND_API_KEY;
      if (!resendKey) {
        return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
      }

      // Load the branded HTML email template matching persona + tone
      const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://masterhq.dev";
      const templatePersona = persona || "founder";
      const templateTone = tone || "casual";
      let html: string;
      try {
        const templateRes = await fetch(`${SITE_URL}/email-${templatePersona}-${templateTone}.html`);
        if (!templateRes.ok) throw new Error(`Template not found: ${templatePersona}-${templateTone}`);
        html = await templateRes.text();
        const contactName = companyName || "there";
        html = html.replace(/\[NAME\]/g, contactName);
        html = html.replace(/\[COMPANY\]/g, companyName || "your company");
      } catch {
        // Fallback: wrap AI-generated text in branded styling
        html = `<div style="background:#0a0a0a;color:#f5f4f0;padding:40px;font-family:sans-serif;max-width:600px;margin:0 auto;">
          <div style="margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #c8ff00;">
            <h1 style="font-size:24px;font-weight:bold;color:#c8ff00;margin:0;">AIG!ITCH</h1>
            <p style="font-size:11px;letter-spacing:3px;color:#00f0ff;margin:4px 0 0;">AI-POWERED SOCIAL MEDIA</p>
          </div>
          ${body.split("\n").map((line: string) => `<p style="margin:12px 0;line-height:1.6;color:#f5f4f0;">${line}</p>`).join("")}
          <div style="margin-top:32px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.1);font-size:12px;color:#888;">
            <p>Stuie French — Founder, AIG!itch</p>
            <p><a href="https://aiglitch.app" style="color:#00f0ff;">aiglitch.app</a> · <a href="https://masterhq.dev/media-kit" style="color:#00f0ff;">Media Kit</a></p>
          </div>
        </div>`;
      }

      const senders: Record<string, { email: string; name: string }> = {
        founder: { email: "stuart.french@aiglitch.app", name: "Stuie French" },
        architect: { email: "architect@aiglitch.app", name: "The Architect" },
        ads: { email: "ads@aiglitch.app", name: "AIG!itch Ads" },
      };
      const sender = senders[templatePersona] || senders.founder;

      const resend = new Resend(resendKey);
      const { data, error } = await resend.emails.send({
        from: `${sender.name} <${sender.email}>`,
        to: toEmail,
        subject,
        html,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Mark email as sent in DB
      if (emailId) {
        try {
          const db = await getDb();
          const { ObjectId } = await import("mongodb");
          if (emailId.length === 24) {
            await db.collection("outreach_emails").updateOne(
              { _id: new ObjectId(emailId) },
              { $set: { sentAt: new Date().toISOString(), sentTo: toEmail, messageId: data?.id || "" } }
            );
          }
        } catch {
          // Don't fail the send if DB update fails
        }
      }

      return NextResponse.json({ success: true, to: toEmail });
    }

    if (action === "delete") {
      const { emailId } = await req.json();
      const db = await getDb();
      const { ObjectId } = await import("mongodb");
      await db.collection("outreach_emails").deleteOne({ _id: new ObjectId(emailId) });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Outreach API error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
