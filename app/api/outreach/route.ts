import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { generateSponsorEmail } from "@/lib/ai";

export async function GET() {
  try {
    const db = await getDb();
    const emails = await db
      .collection("outreach_emails")
      .find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();
    return NextResponse.json(emails);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch emails";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  try {
    if (action === "generate") {
      const { companyName, industry, productDescription, tone, contactEmail } = await req.json();
      if (!companyName || !industry) {
        return NextResponse.json({ error: "Missing companyName or industry" }, { status: 400 });
      }

      // Get current social stats for the email
      const db = await getDb();
      const statsData = await db.collection("social_stats").find({}).toArray();
      const platforms = statsData.map((s) => ({
        name: s.platform as string,
        followers: (s.followers as number) || 0,
        posts: (s.posts as number) || 0,
      }));
      const totalFollowers = platforms.reduce((sum, p) => sum + p.followers, 0);

      const result = await generateSponsorEmail(
        companyName,
        industry,
        productDescription || "",
        tone || "casual",
        { totalFollowers, platforms }
      );

      // Save to DB
      const email = {
        companyName,
        industry,
        productDescription: productDescription || "",
        contactEmail: contactEmail || "",
        tone: tone || "casual",
        ...result,
        status: "draft" as const,
        createdAt: new Date().toISOString(),
      };

      const insertResult = await db.collection("outreach_emails").insertOne(email);

      return NextResponse.json({
        ...email,
        _id: insertResult.insertedId,
      }, { status: 201 });
    }

    if (action === "delete") {
      const { emailId } = await req.json();
      const db = await getDb();
      const { ObjectId } = await import("mongodb");
      await db.collection("outreach_emails").deleteOne({ _id: new ObjectId(emailId) });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Outreach API error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
