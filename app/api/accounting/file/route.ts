import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";
export const maxDuration = 30;

// GET /api/accounting/file?id=INVOICE_ID
// Proxies private Blob Store files through the server so authenticated
// users can view their invoices in the browser.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  // Check session cookie (same cookie our manual auth sets)
  const session = req.cookies.get("masterhq_session");
  if (!session?.value) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const db = await getDb();
    const { ObjectId } = await import("mongodb");
    const invoice = await db
      .collection("accounting_invoices")
      .findOne({ _id: new ObjectId(id) });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Fetch file from private Blob Store with auth token
    const accountingToken = process.env.BLOB_ACCOUNTING_READ_WRITE_TOKEN;
    const fileResponse = await fetch(invoice.fileUrl, {
      headers: accountingToken
        ? { Authorization: `Bearer ${accountingToken}` }
        : {},
    });

    if (!fileResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch file: ${fileResponse.status}` },
        { status: 502 }
      );
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    const contentType = invoice.fileType || "application/octet-stream";

    // Return the file with correct content type so browser displays it
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${invoice.fileName}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to serve file";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
