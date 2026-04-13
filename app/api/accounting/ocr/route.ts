import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";
export const maxDuration = 60;

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

const OCR_SYSTEM_PROMPT = `You are an invoice data extraction assistant. You read invoice images and PDFs and extract structured data.

For every invoice, extract these fields:
- vendor: The company name that issued the invoice (e.g. "Anthropic", "xAI", "Vercel", "DigitalOcean")
- amount: The total amount charged (number only, no currency symbol, e.g. 423.18)
- currency: The currency code (usually "USD" or "AUD")
- date: The invoice date in YYYY-MM-DD format
- gstAmount: GST/tax amount if shown (number only, null if not shown)
- invoiceNumber: The invoice or receipt number if shown (string, null if not shown)
- description: A brief one-line description of what was charged (e.g. "Claude API usage - March 2026")

IMPORTANT RULES:
- Return ONLY valid JSON, no markdown, no explanation, no code fences
- If you cannot read a field, set it to null
- For amount, always use the TOTAL/GRAND TOTAL, not subtotal
- For date, use the invoice/receipt date, not the due date
- Vendor should be the clean company name without "Inc", "LLC", "Pty Ltd" etc
- If the image is not an invoice/receipt, return: {"error": "Not an invoice"}

Example output:
{"vendor":"Anthropic","amount":423.18,"currency":"USD","date":"2026-03-01","gstAmount":null,"invoiceNumber":"INV-2026-0301","description":"Claude API usage - March 2026"}`;

interface OcrResult {
  vendor: string | null;
  amount: number | null;
  currency: string | null;
  date: string | null;
  gstAmount: number | null;
  invoiceNumber: string | null;
  description: string | null;
  error?: string;
}

// POST — OCR an invoice using Claude Vision
// Body: { invoiceId: string } — reads the file from the stored URL
// OR: { imageUrl: string } — reads from a direct URL
export async function POST(req: NextRequest) {
  try {
    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { invoiceId, imageUrl } = body;

    if (!invoiceId && !imageUrl) {
      return NextResponse.json(
        { error: "Provide either invoiceId or imageUrl" },
        { status: 400 }
      );
    }

    const db = await getDb();
    let invoice = null;
    let fileUrl = imageUrl;
    let fileType = "image/jpeg"; // default guess

    // If invoiceId provided, look up the invoice
    if (invoiceId) {
      const { ObjectId } = await import("mongodb");
      invoice = await db
        .collection("accounting_invoices")
        .findOne({ _id: new ObjectId(invoiceId) });

      if (!invoice) {
        return NextResponse.json(
          { error: "Invoice not found" },
          { status: 404 }
        );
      }

      fileUrl = invoice.fileUrl;
      fileType = invoice.fileType || "image/jpeg";

      // Update status to processing
      await db
        .collection("accounting_invoices")
        .updateOne(
          { _id: new ObjectId(invoiceId) },
          { $set: { ocrStatus: "processing" } }
        );
    }

    // Fetch the file and convert to base64
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch file: ${fileResponse.status}`);
    }

    const fileBuffer = Buffer.from(await fileResponse.arrayBuffer());
    const base64Data = fileBuffer.toString("base64");

    // Determine media type for Claude Vision
    let mediaType = "image/jpeg";
    if (fileType === "application/pdf") {
      mediaType = "application/pdf";
    } else if (fileType === "image/png") {
      mediaType = "image/png";
    } else if (fileType === "image/webp") {
      mediaType = "image/webp";
    }

    // Call Claude Vision API
    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: OCR_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: mediaType === "application/pdf" ? "document" : "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: base64Data,
                },
              },
              {
                type: "text",
                text: "Extract the invoice data from this image. Return ONLY valid JSON.",
              },
            ],
          },
        ],
      }),
    });

    if (!claudeResponse.ok) {
      const errText = await claudeResponse.text();
      throw new Error(`Claude Vision API error ${claudeResponse.status}: ${errText}`);
    }

    const claudeData = await claudeResponse.json();
    const rawText = claudeData.content
      ?.filter((c: { type: string }) => c.type === "text")
      ?.map((c: { text: string }) => c.text)
      ?.join("") || "";

    // Parse the JSON response
    let ocrResult: OcrResult;
    try {
      ocrResult = JSON.parse(rawText.trim());
    } catch {
      // Claude sometimes wraps in code fences despite instructions
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        ocrResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error(`Could not parse OCR response: ${rawText.slice(0, 200)}`);
      }
    }

    // If we have an invoiceId, update the invoice record with OCR data
    if (invoiceId && invoice) {
      const { ObjectId } = await import("mongodb");

      // Try to auto-match category by vendor name
      let matchedCategoryId: string | null = null;
      if (ocrResult.vendor) {
        const category = await db
          .collection("accounting_categories")
          .findOne({
            name: { $regex: ocrResult.vendor, $options: "i" },
            type: "expense",
          });
        if (category) {
          matchedCategoryId = category._id.toString();
        }
      }

      await db
        .collection("accounting_invoices")
        .updateOne(
          { _id: new ObjectId(invoiceId) },
          {
            $set: {
              vendor: ocrResult.vendor || invoice.vendor,
              amount: ocrResult.amount || invoice.amount,
              date: ocrResult.date || invoice.date,
              gstAmount: ocrResult.gstAmount,
              categoryId: matchedCategoryId || invoice.categoryId,
              ocrStatus: "complete",
              ocrData: ocrResult,
              ocrRawText: rawText,
              status: "pending_review",
              updatedAt: new Date().toISOString(),
            },
          }
        );
    }

    return NextResponse.json({
      success: true,
      ocrResult,
      invoiceId: invoiceId || null,
      autoMatchedCategory: ocrResult.vendor ? true : false,
    });
  } catch (error) {
    // Update invoice status on error
    if (req.body) {
      try {
        const db = await getDb();
        const { ObjectId } = await import("mongodb");
        const bodyText = await req.clone().json().catch(() => null);
        if (bodyText?.invoiceId) {
          await db
            .collection("accounting_invoices")
            .updateOne(
              { _id: new ObjectId(bodyText.invoiceId) },
              { $set: { ocrStatus: "error", ocrError: String(error) } }
            );
        }
      } catch { /* ignore cleanup errors */ }
    }

    const msg = error instanceof Error ? error.message : "OCR failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
