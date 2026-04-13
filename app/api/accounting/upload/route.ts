import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB per file

// POST — upload one or more invoice files
// Accepts multipart FormData with:
//   files: File[] (one or more invoice files)
//   vendor?: string (optional — can be set later after OCR)
//   category?: string (optional category ID)
//   date?: string (optional ISO date)
//   amount?: string (optional — can be extracted by OCR)
//   notes?: string
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    const vendor = formData.get("vendor") as string | null;
    const category = formData.get("category") as string | null;
    const date = formData.get("date") as string | null;
    const amount = formData.get("amount") as string | null;
    const notes = formData.get("notes") as string | null;

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided. Upload at least one invoice file." },
        { status: 400 }
      );
    }

    // Validate all files before uploading any
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          {
            error: `Invalid file type: ${file.type} (${file.name}). Accepted: PDF, JPEG, PNG, WebP, HEIC`,
          },
          { status: 400 }
        );
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            error: `File too large: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB). Max: 20MB`,
          },
          { status: 400 }
        );
      }
    }

    const db = await getDb();
    const results = [];

    for (const file of files) {
      // Generate a clean path: accounting/YYYY-MM/filename
      const now = new Date();
      const monthFolder = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `accounting/${monthFolder}/${Date.now()}-${safeName}`;

      // Upload to Vercel Blob
      // Uses BLOB_ACCOUNTING_READ_WRITE_TOKEN for private accounting-vault store
      // Falls back to default BLOB_READ_WRITE_TOKEN (public) if not configured
      const accountingToken = process.env.BLOB_ACCOUNTING_READ_WRITE_TOKEN;
      const isPrivate = !!accountingToken;
      const blob = await put(path, file, {
        access: isPrivate ? "private" : "public",
        ...(accountingToken ? { token: accountingToken } : {}),
      });

      // Save metadata to MongoDB
      const invoice = {
        fileUrl: blob.url,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        blobPath: path,
        vendor: vendor || null,
        categoryId: category || null,
        date: date || null,
        amount: amount ? parseFloat(amount) : null,
        gstAmount: null as number | null,
        currency: "AUD",
        ocrStatus: "pending" as const,
        ocrData: null,
        status: "pending_review" as const,
        notes: notes || null,
        createdAt: new Date().toISOString(),
      };

      const insertResult = await db.collection("accounting_invoices").insertOne(invoice);
      results.push({ ...invoice, _id: insertResult.insertedId });
    }

    const accountingToken = process.env.BLOB_ACCOUNTING_READ_WRITE_TOKEN;
    return NextResponse.json(
      {
        success: true,
        count: results.length,
        invoices: results,
        storageWarning: !accountingToken
          ? "Using public Blob Store. Set BLOB_ACCOUNTING_READ_WRITE_TOKEN for private storage."
          : undefined,
      },
      { status: 201 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to upload invoice";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
