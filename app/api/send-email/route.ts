import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";
export const maxDuration = 30;

// Droplet email sender URL
const EMAIL_SENDER_URL = process.env.EMAIL_SENDER_URL || "http://170.64.133.9:3456";
const EMAIL_AUTH_TOKEN = process.env.TERMINAL_PASSWORD || "";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://masterhq.dev";

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

// getTemplatePersona is handled inside getTemplateHtml

export async function GET() {
  // Health check — test connection to droplet email sender
  try {
    const res = await fetch(`${EMAIL_SENDER_URL}/health`, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    return NextResponse.json({ dropletStatus: "connected", ...data, emailSenderUrl: EMAIL_SENDER_URL });
  } catch (err) {
    return NextResponse.json({
      dropletStatus: "unreachable",
      emailSenderUrl: EMAIL_SENDER_URL,
      error: err instanceof Error ? err.message : String(err),
      setup: "Run on droplet: cd /path/to/Master && IMPROVMX_FOUNDER_PASSWORD=xxx IMPROVMX_ARCHITECT_PASSWORD=xxx IMPROVMX_ADS_PASSWORD=xxx node scripts/email-sender.js",
    });
  }
}

export async function POST(req: NextRequest) {
  try {
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

    // Load template via HTTP from public folder
    const templateHtml = await getTemplateHtml(persona, tone);
    const contactName = (prospect.linkedinTitle || prospect.company).split(",")[0].trim();
    const subject = extractSubject(persona, tone, prospect.company);

    // Send via droplet email sender (real server, no SMTP blocking)
    const sendRes = await fetch(`${EMAIL_SENDER_URL}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${EMAIL_AUTH_TOKEN}`,
      },
      body: JSON.stringify({
        persona,
        to: prospect.email,
        subject,
        html: templateHtml,
        contactName,
        company: prospect.company,
      }),
      signal: AbortSignal.timeout(20000),
    });

    const sendData = await sendRes.json();

    if (!sendRes.ok) {
      return NextResponse.json({ error: sendData.error || "Failed to send via droplet" }, { status: 500 });
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
      messageId: sendData.messageId || "",
      sentVia: "droplet-smtp",
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
      messageId: sendData.messageId,
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
