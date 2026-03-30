import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import nodemailer from "nodemailer";
import { readFileSync } from "fs";
import { join } from "path";

const SMTP_HOST = "smtp.improvmx.com";
const SMTP_PORT = 587;

interface SendEmailBody {
  prospectId: string;
  tone: "casual" | "formal" | "bold";
  persona: "founder" | "architect";
}

const senderConfig = {
  founder: {
    email: process.env.IMPROVMX_FOUNDER_EMAIL || "stuart.french@aiglitch.app",
    password: process.env.IMPROVMX_FOUNDER_PASSWORD || "",
    name: "Stuie French",
  },
  architect: {
    email: process.env.IMPROVMX_ARCHITECT_EMAIL || "architect@aiglitch.app",
    password: process.env.IMPROVMX_ARCHITECT_PASSWORD || "",
    name: "The Architect",
  },
};

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
  };
  return subjects[persona]?.[tone] || `Partnership Opportunity — ${company}`;
}

export async function POST(req: NextRequest) {
  try {
    const body: SendEmailBody = await req.json();
    const { prospectId, tone, persona = "founder" } = body;

    if (!prospectId) {
      return NextResponse.json({ error: "Missing prospectId" }, { status: 400 });
    }

    const sender = senderConfig[persona];
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

    // Load and personalize template
    const templateHtml = getTemplateHtml(persona, tone);
    const contactName = (prospect.linkedinTitle || prospect.company).split(",")[0].trim();
    const html = personalizeTemplate(templateHtml, contactName, prospect.company);
    const subject = extractSubject(persona, tone, prospect.company);

    // Create SMTP transport
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: false,
      auth: {
        user: sender.email,
        pass: sender.password,
      },
    });

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
