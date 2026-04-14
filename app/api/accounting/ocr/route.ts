import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";
export const maxDuration = 60;

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

const OCR_SYSTEM_PROMPT = `You are a financial document extraction assistant. You read invoices, receipts, AND payslips/payroll documents, and extract structured data.

First, determine the DOCUMENT TYPE by looking at the content:
- If it shows charges/billing from a company → type: "invoice"
- If it shows salary/wages, tax withheld, superannuation → type: "payslip"
- If unclear → type: "invoice" (default)

FOR INVOICES/RECEIPTS, extract:
- documentType: "invoice"
- vendor: Company name that issued the invoice (e.g. "Anthropic", "xAI", "Vercel")
- amount: Total amount charged (number only, no currency symbol)
- currency: Currency code ("USD" or "AUD")
- date: Invoice date in YYYY-MM-DD format
- gstAmount: GST/tax amount if shown (number, null if not shown)
- invoiceNumber: Invoice/receipt number (string, null if not shown)
- description: Brief one-line description (e.g. "Claude API usage - March 2026")

FOR PAYSLIPS, extract:
- documentType: "payslip"
- vendor: Employer name
- amount: Net pay / take-home amount (number only)
- currency: "AUD"
- date: Pay date in YYYY-MM-DD format
- gstAmount: null (not applicable)
- invoiceNumber: null
- description: "Salary/wages - [pay period]"
- payslipData: {
    grossPay: total earnings before deductions (number),
    netPay: take-home pay after all deductions (number),
    payg: PAYG tax withheld (number),
    superannuation: employer super contribution (number),
    superRate: super rate as percentage if shown (number, e.g. 11.5),
    payPeriodStart: start of pay period YYYY-MM-DD (string, null if not shown),
    payPeriodEnd: end of pay period YYYY-MM-DD (string, null if not shown),
    hoursWorked: total hours if shown (number, null if not shown),
    hourlyRate: hourly rate if shown (number, null if not shown),
    ytdGross: year-to-date gross earnings if shown (number, null if not shown),
    ytdTax: year-to-date tax withheld if shown (number, null if not shown),
    ytdSuper: year-to-date super if shown (number, null if not shown),
    employer: employer name (string),
    employeeName: employee name if shown (string, null if not shown),
    otherDeductions: any other deductions as array of {name, amount} (array, null if none)
  }

IMPORTANT RULES:
- Return ONLY valid JSON, no markdown, no explanation, no code fences
- If you cannot read a field, set it to null
- For invoices: always use the TOTAL/GRAND TOTAL, not subtotal
- For payslips: "amount" field should be NET PAY (take-home)
- For date, use the invoice/pay date, not the due date
- Vendor/employer should be the clean company name without "Inc", "LLC", "Pty Ltd"
- If the image is not a financial document, return: {"error": "Not a financial document"}
- payslipData should ONLY be included when documentType is "payslip"

Example invoice output:
{"documentType":"invoice","vendor":"Anthropic","amount":423.18,"currency":"USD","date":"2026-03-01","gstAmount":null,"invoiceNumber":"INV-2026-0301","description":"Claude API usage - March 2026"}

Example payslip output:
{"documentType":"payslip","vendor":"Acme Corp","amount":2847.50,"currency":"AUD","date":"2026-03-15","gstAmount":null,"invoiceNumber":null,"description":"Salary/wages - 01/03/2026 to 15/03/2026","payslipData":{"grossPay":3850.00,"netPay":2847.50,"payg":742.00,"superannuation":442.75,"superRate":11.5,"payPeriodStart":"2026-03-01","payPeriodEnd":"2026-03-15","hoursWorked":76,"hourlyRate":50.66,"ytdGross":23100.00,"ytdTax":4452.00,"ytdSuper":2656.50,"employer":"Acme Corp","employeeName":"Stuart French","otherDeductions":null}}`;

interface PayslipData {
  grossPay: number | null;
  netPay: number | null;
  payg: number | null;
  superannuation: number | null;
  superRate: number | null;
  payPeriodStart: string | null;
  payPeriodEnd: string | null;
  hoursWorked: number | null;
  hourlyRate: number | null;
  ytdGross: number | null;
  ytdTax: number | null;
  ytdSuper: number | null;
  employer: string | null;
  employeeName: string | null;
  otherDeductions: Array<{ name: string; amount: number }> | null;
}

interface OcrResult {
  documentType?: "invoice" | "payslip";
  vendor: string | null;
  amount: number | null;
  currency: string | null;
  date: string | null;
  gstAmount: number | null;
  invoiceNumber: string | null;
  description: string | null;
  payslipData?: PayslipData;
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

    // Fetch the file — private Blob Store URLs need the token
    const accountingToken = process.env.BLOB_ACCOUNTING_READ_WRITE_TOKEN;
    const fileResponse = await fetch(fileUrl, {
      headers: accountingToken
        ? { Authorization: `Bearer ${accountingToken}` }
        : {},
    });
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch file: ${fileResponse.status} ${fileResponse.statusText}`);
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
      // Payslips match to income categories, invoices to expense
      const isPayslip = ocrResult.documentType === "payslip";
      let matchedCategoryId: string | null = null;
      if (ocrResult.vendor) {
        const category = await db
          .collection("accounting_categories")
          .findOne({
            name: { $regex: ocrResult.vendor, $options: "i" },
            type: isPayslip ? "income" : "expense",
          });
        if (category) {
          matchedCategoryId = category._id.toString();
        }
      }
      // For payslips without a vendor match, try to match "Employment Income" or "Salary" category
      if (isPayslip && !matchedCategoryId) {
        const salaryCategory = await db
          .collection("accounting_categories")
          .findOne({
            name: { $regex: /salary|employment|wages/i },
            type: "income",
          });
        if (salaryCategory) {
          matchedCategoryId = salaryCategory._id.toString();
        }
      }

      // Determine scope: payslips are personal, invoices default to invoice's existing scope
      // or the matched category's scope, or "business" as fallback
      let determinedScope = invoice.scope || "business";
      if (isPayslip) {
        determinedScope = "personal";
      } else if (matchedCategoryId && !invoice.scope) {
        const matchedCat = await db
          .collection("accounting_categories")
          .findOne({ _id: new ObjectId(matchedCategoryId) });
        if (matchedCat?.scope) determinedScope = matchedCat.scope;
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
              scope: determinedScope,
              documentType: ocrResult.documentType || "invoice",
              payslipData: ocrResult.payslipData || null,
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
