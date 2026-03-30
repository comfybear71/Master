import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";
export const maxDuration = 30;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://masterhq.dev";

const PERSONA_EMAILS: Record<string, { email: string; name: string }> = {
  founder: { email: "stuart.french@aiglitch.app", name: "Stuie French" },
  architect: { email: "architect@aiglitch.app", name: "The Architect" },
  ads: { email: "ads@aiglitch.app", name: "AIG!itch Ads" },
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
  const hasKey = !!process.env.RESEND_API_KEY;
  return NextResponse.json({
    status: hasKey ? "configured" : "missing RESEND_API_KEY",
    provider: "resend",
    personas: Object.entries(PERSONA_EMAILS).map(([k, v]) => ({ persona: k, email: v.email })),
  });
}

export async function POST(req: NextRequest) {
  try {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
    }

    const resend = new Resend(resendKey);
    const body: SendEmailBody = await req.json();
    const { prospectId, tone, persona = "founder" } = body;

    if (!prospectId) {
      return NextResponse.json({ error: "Missing prospectId" }, { status: 400 });
    }

    const db = await getDb();
    const { ObjectId } = await import("mongodb");

    const prospect = await db.collection("prospects").findOne({ _id: new ObjectId(prospectId) });
    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
    }

    if (!prospect.email) {
      return NextResponse.json({ error: "Prospect has no email address" }, { status: 400 });
    }

    // Load and personalize template
    const templateHtml = await getTemplateHtml(persona, tone);
    const contactName = (prospect.linkedinTitle || prospect.company).split(",")[0].trim();
    const subject = extractSubject(persona, tone, prospect.company);

    let finalHtml = templateHtml;
    finalHtml = finalHtml.replace(/\[NAME\]/g, contactName);
    finalHtml = finalHtml.replace(/\[COMPANY\]/g, prospect.company);

    // Send via Resend HTTP API
    const sender = PERSONA_EMAILS[persona] || PERSONA_EMAILS.founder;
    const { data, error } = await resend.emails.send({
      from: `${sender.name} <${sender.email}>`,
      to: [prospect.email],
      subject,
      html: finalHtml,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

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

    return NextResponse.json({
      success: true,
      messageId: data?.id,
      to: prospect.email,
      subject,
      persona,
      tone,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
