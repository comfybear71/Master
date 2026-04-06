import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { Resend } from "resend";

export const runtime = "nodejs";
export const maxDuration = 30;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://masterhq.dev";

const SENDERS: Record<string, { email: string; name: string }> = {
  founder: {
    email: "stuart.french@aiglitch.app",
    name: "Stuie French",
  },
  architect: {
    email: "architect@aiglitch.app",
    name: "The Architect",
  },
  ads: {
    email: "ads@aiglitch.app",
    name: "AIG!itch Ads",
  },
};

interface SendEmailBody {
  prospectId: string;
  tone: "casual" | "formal" | "bold";
  persona: "founder" | "architect" | "ads";
}

async function getTemplateHtml(persona: string, tone: string): Promise<string> {
  const templatePersona = persona === "ads" ? "founder" : persona;
  const url = `${SITE_URL}/email-${templatePersona}-${tone}.html`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch template: ${url} (${res.status})`);
  return res.text();
}

function extractSubject(persona: string, tone: string, company: string): string {
  const subjects: Record<string, Record<string, string>> = {
    founder: {
      casual: `Hey! Quick idea for ${company}`,
      formal: `Advertising Partnership Proposal — ${company}`,
      bold: `${company}, your brand deserves better advertising`,
    },
    architect: {
      casual: `Got an idea for ${company}`,
      formal: `Advertising Partnership Inquiry — ${company}`,
      bold: `${company} — your competitors will see this next`,
    },
    ads: {
      casual: `Hey! Quick idea for ${company}`,
      formal: `Advertising Partnership Proposal — ${company}`,
      bold: `${company}, your brand deserves better advertising`,
    },
  };
  return subjects[persona]?.[tone] || `Partnership Opportunity — ${company}`;
}

export async function GET() {
  const hasResendKey = !!process.env.RESEND_API_KEY;
  return NextResponse.json({
    status: hasResendKey ? "ready" : "missing_api_key",
    provider: "resend",
    senders: Object.entries(SENDERS).map(([persona, s]) => ({
      persona,
      email: s.email,
      name: s.name,
    })),
    note: hasResendKey
      ? "Resend API configured and ready to send"
      : "Add RESEND_API_KEY to Vercel env vars. Get one free at resend.com",
  });
}

export async function POST(req: NextRequest) {
  const steps: string[] = [];
  try {
    const resendKey = process.env.RESEND_AIGLITCH_API_KEY || process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json({
        error: "RESEND_AIGLITCH_API_KEY not configured in Vercel env vars.",
        steps: ["No Resend API key found"],
      }, { status: 500 });
    }

    steps.push("1. Parsing request body");
    const body: SendEmailBody = await req.json();
    const { prospectId, tone, persona = "founder" } = body;
    steps.push(`2. Got prospectId=${prospectId}, tone=${tone}, persona=${persona}`);

    if (!prospectId) {
      return NextResponse.json({ error: "Missing prospectId", steps }, { status: 400 });
    }

    steps.push("3. Connecting to MongoDB");
    const db = await getDb();
    const { ObjectId } = await import("mongodb");

    steps.push("4. Looking up prospect");
    const prospect = await db.collection("prospects").findOne({ _id: new ObjectId(prospectId) });
    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found", steps }, { status: 404 });
    }
    steps.push(`5. Found prospect: ${prospect.company} (${prospect.email})`);

    if (!prospect.email) {
      return NextResponse.json({ error: "Prospect has no email address", steps }, { status: 400 });
    }

    steps.push("6. Loading email template");
    let templateHtml: string;
    try {
      templateHtml = await getTemplateHtml(persona, tone);
      steps.push(`7. Template loaded (${templateHtml.length} chars)`);
    } catch (templateErr) {
      const msg = templateErr instanceof Error ? templateErr.message : String(templateErr);
      return NextResponse.json({ error: `Template load failed: ${msg}`, steps }, { status: 500 });
    }

    const contactName = (prospect.linkedinTitle || prospect.company).split(",")[0].trim();
    const subject = extractSubject(persona, tone, prospect.company);
    steps.push(`8. Subject: ${subject}, Contact: ${contactName}`);

    // Personalize template
    let finalHtml = templateHtml;
    if (contactName) finalHtml = finalHtml.replace(/\[NAME\]/g, contactName);
    if (prospect.company) finalHtml = finalHtml.replace(/\[COMPANY\]/g, prospect.company);

    const sender = SENDERS[persona] || SENDERS.founder;

    steps.push(`9. Sending via Resend from ${sender.email}`);
    const resend = new Resend(resendKey);
    const { data, error } = await resend.emails.send({
      from: `${sender.name} <${sender.email}>`,
      to: [prospect.email],
      subject,
      html: finalHtml,
    });

    if (error) {
      return NextResponse.json({
        error: `Resend error: ${error.message}`,
        resendError: error,
        steps,
      }, { status: 500 });
    }

    steps.push("10. Email sent successfully, logging to DB");

    // Log to database
    await db.collection("outreach_emails").insertOne({
      prospectId: String(prospect._id),
      companyName: prospect.company,
      industry: prospect.industry,
      contactEmail: prospect.email,
      subject,
      persona,
      tone,
      status: "sent",
      messageId: data?.id || "",
      sentVia: "resend",
      createdAt: new Date().toISOString(),
    });

    // Update prospect status
    await db.collection("prospects").updateOne(
      { _id: new ObjectId(prospectId) },
      {
        $set: {
          status: "contacted",
          lastContactedAt: new Date().toISOString(),
        },
        $inc: { emailsSent: 1 },
      }
    );

    steps.push("11. Done!");

    return NextResponse.json({
      success: true,
      messageId: data?.id,
      to: prospect.email,
      subject,
      persona,
      tone,
      provider: "resend",
      steps,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send email";
    const stack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json({ error: message, stack, steps }, { status: 500 });
  }
}
