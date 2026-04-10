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

    if (action === "delete") {
      const { emailId } = await req.json();
      const db = await getDb();
      const { ObjectId } = await import("mongodb");
      await db.collection("outreach_emails").deleteOne({ _id: new ObjectId(emailId) });
      return NextResponse.json({ success: true });
    }

    if (action === "send") {
      const { toEmail, subject, companyName, persona = "founder" } = await req.json();
      if (!toEmail || !subject) {
        return NextResponse.json({ error: "Missing toEmail or subject" }, { status: 400 });
      }

      const resendKey = process.env.RESEND_API_KEY;
      if (!resendKey) {
        return NextResponse.json({
          error: "RESEND_API_KEY not configured. Add it in Vercel env vars.",
        }, { status: 500 });
      }

      // Fetch the grant-pitch template HTML from the public file
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://masterhq.dev";
      const templateRes = await fetch(`${siteUrl}/grant-pitch.html`);
      if (!templateRes.ok) {
        return NextResponse.json({ error: "Failed to load grant-pitch template" }, { status: 500 });
      }
      let templateHtml = await templateRes.text();

      // Extract just the email body content, strip the controls and script
      const bodyMatch = templateHtml.match(/<div class="email-body">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*<script>/);
      let emailContent = bodyMatch ? bodyMatch[1] : "";

      // Personalize the greeting name
      const recipientName = companyName || "there";
      emailContent = emailContent.replace(/>there</, `>${recipientName}<`);

      // Wrap in email-safe HTML
      const finalHtml = `<div style="background:#0a0a0a;padding:20px;font-family:Helvetica Neue,Arial,sans-serif;">
        <div style="max-width:600px;margin:0 auto;background:#141414;border-radius:16px;border:1px solid rgba(0,240,255,0.12);overflow:hidden;">
        ${emailContent}
        </div></div>`;

      const senders: Record<string, { email: string; name: string }> = {
        founder: { email: "stuart.french@aiglitch.app", name: "Stuie French" },
        architect: { email: "architect@aiglitch.app", name: "The Architect" },
      };
      const sender = senders[persona] || senders.founder;

      const resend = new Resend(resendKey);
      const { data, error: sendError } = await resend.emails.send({
        from: `${sender.name} <${sender.email}>`,
        to: [toEmail],
        subject,
        html: finalHtml,
      });

      if (sendError) {
        return NextResponse.json({ error: sendError.message }, { status: 500 });
      }

      // Log to DB
      const db = await getDb();
      await db.collection("outreach_emails").insertOne({
        companyName: companyName || "Grant Pitch",
        contactEmail: toEmail,
        subject,
        persona,
        status: "sent",
        messageId: data?.id || "",
        sentVia: "resend",
        source: "grant-pitch",
        createdAt: new Date().toISOString(),
      });

      return NextResponse.json({ success: true, messageId: data?.id, to: toEmail });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Outreach API error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
