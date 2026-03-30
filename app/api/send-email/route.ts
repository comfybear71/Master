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
  const steps: string[] = [];
  try {
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

    steps.push(`9. Sending to droplet at ${EMAIL_SENDER_URL}/send`);
    let sendRes: Response;
    try {
      sendRes = await fetch(`${EMAIL_SENDER_URL}/send`, {
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
        signal: AbortSignal.timeout(25000),
      });
    } catch (fetchErr) {
      const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      return NextResponse.json({
        error: `Droplet fetch failed: ${msg}`,
        dropletUrl: EMAIL_SENDER_URL,
        steps,
      }, { status: 500 });
    }

    steps.push(`10. Droplet responded: ${sendRes.status}`);
    let sendData: Record<string, unknown>;
    try {
      sendData = await sendRes.json();
    } catch {
      const text = await sendRes.text();
      return NextResponse.json({ error: `Droplet returned non-JSON: ${text.substring(0, 200)}`, steps }, { status: 500 });
    }

    if (!sendRes.ok) {
      return NextResponse.json({ error: sendData.error || "Droplet send failed", dropletResponse: sendData, steps }, { status: 500 });
    }

    steps.push("11. Email sent successfully, logging to DB");

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
      messageId: (sendData.messageId as string) || "",
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

    steps.push("12. Done!");

    return NextResponse.json({
      success: true,
      messageId: sendData.messageId,
      to: prospect.email,
      subject,
      persona,
      tone,
      steps,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send email";
    const stack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json({ error: message, stack, steps }, { status: 500 });
  }
}
