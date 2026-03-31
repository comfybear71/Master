import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_LOGO_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml", "image/gif"];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const company = formData.get("company") as string || "Unknown";
    const email = formData.get("email") as string || "";
    const tier = formData.get("tier") as string || "glitch";

    const uploadedFiles: { name: string; url: string; type: string }[] = [];

    // Process logo
    const logo = formData.get("logo") as File | null;
    if (logo && logo.size > 0) {
      if (!ALLOWED_TYPES.includes(logo.type)) {
        return NextResponse.json({ error: `Logo: invalid type ${logo.type}. Use JPEG, PNG, WebP, SVG, or GIF.` }, { status: 400 });
      }
      if (logo.size > MAX_LOGO_SIZE) {
        return NextResponse.json({ error: "Logo must be under 5MB" }, { status: 400 });
      }
      const slug = company.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
      const ext = logo.name.split(".").pop() || "png";
      const blob = await put(`sponsors/${slug}/logo.${ext}`, logo, { access: "public" });
      uploadedFiles.push({ name: "Logo", url: blob.url, type: "logo" });
    }

    // Process up to 5 product images
    for (let i = 1; i <= 5; i++) {
      const img = formData.get(`image${i}`) as File | null;
      if (img && img.size > 0) {
        if (!ALLOWED_TYPES.includes(img.type)) {
          return NextResponse.json({ error: `Image ${i}: invalid type ${img.type}` }, { status: 400 });
        }
        if (img.size > MAX_IMAGE_SIZE) {
          return NextResponse.json({ error: `Image ${i} must be under 10MB` }, { status: 400 });
        }
        const slug = company.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
        const ext = img.name.split(".").pop() || "png";
        const blob = await put(`sponsors/${slug}/image-${i}.${ext}`, img, { access: "public" });
        uploadedFiles.push({ name: `Product Image ${i}`, url: blob.url, type: "image" });
      }
    }

    if (uploadedFiles.length === 0) {
      return NextResponse.json({ error: "No files uploaded. Please attach at least a logo." }, { status: 400 });
    }

    // Save to MongoDB
    const db = await getDb();
    await db.collection("sponsor_uploads").insertOne({
      company,
      email,
      tier,
      files: uploadedFiles,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      files: uploadedFiles,
      message: `${uploadedFiles.length} file(s) uploaded for ${company}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
