import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import nodemailer from "nodemailer";
import { readFileSync } from "fs";
import { join } from "path";

const SMTP_HOST = "smtp.improvmx.com";
const SMTP_PORT = 587;
const SMTP_PORT_SSL = 465;

interface SendEmailBody {
  prospectId: string;
  tone: "casual" | "formal" | "bold";
  persona: "founder" | "architect" | "ads";
}

function getSenderConfig() {
  return {
    founder: {
      email: (process.env.IMPROVMX_FOUNDER_EMAIL || "stuart.french@aiglitch.app").trim(),
      password: (process.env.IMPROVMX_FOUNDER_PASSWORD || "").trim(),
      name: "Stuie French",
    },
    architect: {
      email: (process.env.IMPROVMX_ARCHITECT_EMAIL || "architect@aiglitch.app").trim(),
      password: (process.env.IMPROVMX_ARCHITECT_PASSWORD || "").trim(),
      name: "The Architect",
    },
    ads: {
      email: (process.env.IMPROVMX_ADS_EMAIL || "ads@aiglitch.app").trim(),
      password: (process.env.IMPROVMX_ADS_PASSWORD || "").trim(),
      name: "AIG!itch Ads",
    },
  };
}

function getTemplateHtml(persona: string, tone: string): string {
  const filename = `email-${persona}-${tone}.html`;
  const filepath = join(process.cwd(), "public", filename);
  return readFileSync(filepath, "utf-8");
}

function personalizeTemplate(html: string, name: string, company: string): string {
  return html
    .replace(/\[NAME\]/g, name)
    .replace(/\[COMPANY\]/g, company);
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

function getTemplatePersona(persona: string): string {
  // ads persona uses the founder templates
  return persona === "ads" ? "founder" : persona;
}

export async function GET() {
  const config = getSenderConfig();
  return NextResponse.json({
    founder: {
      email: config.founder.email,
      passwordSet: config.founder.password.length > 0,
      passwordLength: config.founder.password.length,
      passwordPreview: config.founder.password ? config.founder.password.substring(0, 3) + "..." : "(empty)",
    },
    architect: {
      email: config.architect.email,
      passwordSet: config.architect.password.length > 0,
      passwordLength: config.architect.password.length,
      passwordPreview: config.architect.password ? config.architect.password.substring(0, 3) + "..." : "(empty)",
    },
    ads: {
      email: config.ads.email,
      passwordSet: config.ads.password.length > 0,
      passwordLength: config.ads.password.length,
      passwordPreview: config.ads.password ? config.ads.password.substring(0, 3) + "..." : "(empty)",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body: SendEmailBody = await req.json();
    const { prospectId, tone, persona = "founder" } = body;

    if (!prospectId) {
      return NextResponse.json({ error: "Missing prospectId" }, { status: 400 });
    }

    const sender = getSenderConfig()[persona];
    if (!sender.password) {
      return NextResponse.json(
        { error: `SMTP password not configured for ${persona}. Set IMPROVMX_${persona.toUpperCase()}_PASSWORD env var.` },
        { status: 500 }
      );
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

    // Load and personalize template (ads uses founder templates)
    const templateHtml = getTemplateHtml(getTemplatePersona(persona), tone);
    const contactName = (prospect.linkedinTitle || prospect.company).split(",")[0].trim();
    const html = personalizeTemplate(templateHtml, contactName, prospect.company);
    const subject = extractSubject(persona, tone, prospect.company);

    // Create SMTP transport — port 587 with STARTTLS
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: false,
      requireTLS: true,
      auth: {
        user: sender.email,
        pass: sender.password,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    try {
      await transporter.verify();
    } catch (verifyErr) {
      const msg = verifyErr instanceof Error ? verifyErr.message : String(verifyErr);
      return NextResponse.json({
        error: `SMTP auth failed: ${msg}`,
        debug: {
          host: SMTP_HOST,
          port: SMTP_PORT,
          user: sender.email,
          passwordLength: sender.password.length,
          passwordFirst3: sender.password.substring(0, 3),
          passwordLast3: sender.password.substring(sender.password.length - 3),
        },
      }, { status: 500 });
    }

    // Send email
    const info = await transporter.sendMail({
      from: `"${sender.name}" <${sender.email}>`,
      to: prospect.email,
      subject,
      html,
    });

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
      messageId: info.messageId,
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
      messageId: info.messageId,
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
