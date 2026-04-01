import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Temporary endpoint to fix sponsor data
// DELETE THIS FILE after fixes are done
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  try {
    const db = await getDb();

    if (action === "move-budju-images") {
      const oldFiles = [
        { oldUrl: "https://efxrfrxecvegqgub.public.blob.vercel-storage.com/sponsors/unknown/logo.jpeg", newPath: "sponsors/budju/logo.jpeg", type: "logo", name: "Logo" },
        { oldUrl: "https://efxrfrxecvegqgub.public.blob.vercel-storage.com/sponsors/unknown/image-1.jpeg", newPath: "sponsors/budju/image-1.jpeg", type: "image", name: "Product Image 1" },
        { oldUrl: "https://efxrfrxecvegqgub.public.blob.vercel-storage.com/sponsors/unknown/image-2.jpeg", newPath: "sponsors/budju/image-2.jpeg", type: "image", name: "Product Image 2" },
        { oldUrl: "https://efxrfrxecvegqgub.public.blob.vercel-storage.com/sponsors/unknown/image-3.jpeg", newPath: "sponsors/budju/image-3.jpeg", type: "image", name: "Product Image 3" },
      ];

      const newFiles = [];
      const oldUrls = [];

      for (const f of oldFiles) {
        // Download from old URL
        const response = await fetch(f.oldUrl);
        if (!response.ok) {
          return NextResponse.json({ error: `Failed to fetch ${f.oldUrl}: ${response.status}` }, { status: 500 });
        }
        const blob = await response.blob();

        // Upload to new path
        const newBlob = await put(f.newPath, blob, { access: "public" });
        newFiles.push({ name: f.name, url: newBlob.url, type: f.type });
        oldUrls.push(f.oldUrl);
      }

      // Update MongoDB with new URLs
      await db.collection("sponsor_uploads").updateMany(
        { company: "BUDJU" },
        { $set: { files: newFiles } }
      );

      // Delete old blobs
      for (const url of oldUrls) {
        try {
          await del(url);
        } catch {
          // Ignore delete errors — old files may be on a different store
        }
      }

      return NextResponse.json({ success: true, newFiles, message: "Moved 4 files from sponsors/unknown/ to sponsors/budju/" });
    }

    // Default: show all sponsor uploads
    const uploads = await db.collection("sponsor_uploads").find({}).toArray();
    return NextResponse.json({ uploads });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
