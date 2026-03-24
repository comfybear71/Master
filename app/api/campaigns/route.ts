import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { generateCampaign } from "@/lib/ai";
import { publishToplatform } from "@/lib/social";
import { Campaign } from "@/lib/types";
import { ObjectId } from "mongodb";

export async function GET() {
  try {
    const db = await getDb();
    const campaigns = await db
      .collection<Campaign>("campaigns")
      .find({})
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();
    return NextResponse.json(campaigns);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch campaigns";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  try {
    if (action === "generate") {
      const { brief, projectName, targetAudience } = await req.json();
      if (!brief || !projectName) {
        return NextResponse.json({ error: "Missing brief or projectName" }, { status: 400 });
      }

      // Try to get project context
      let projectContext = "";
      try {
        const db = await getDb();
        const project = await db.collection("projects").findOne({ name: projectName });
        if (project?.claudeMd) projectContext = project.claudeMd;
      } catch {
        // no project context available
      }

      const result = await generateCampaign(brief, projectName, targetAudience || "", projectContext);

      // Save campaign to DB
      const db = await getDb();
      const campaign = {
        name: result.name,
        brief,
        projectName,
        targetAudience: targetAudience || "",
        status: "draft" as const,
        posts: result.posts,
        createdAt: new Date().toISOString(),
      };

      const insertResult = await db.collection("campaigns").insertOne(campaign);

      return NextResponse.json({
        ...campaign,
        _id: insertResult.insertedId,
      }, { status: 201 });
    }

    if (action === "publish") {
      const { campaignId } = await req.json();
      const db = await getDb();
      const campaign = await db.collection("campaigns").findOne({ _id: new ObjectId(campaignId) });

      if (!campaign) {
        return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
      }

      const results: Array<{ platform: string; success: boolean; error?: string }> = [];

      // Load social config for Facebook page ID etc.
      const socialConfig = await db.collection("settings").findOne({ key: "social_config" });

      for (let i = 0; i < campaign.posts.length; i++) {
        const post = campaign.posts[i];
        try {
          if (post.status !== "published") {
            const fullContent = post.hashtags?.length
              ? `${post.content}\n\n${post.hashtags.map((t: string) => `#${t}`).join(" ")}`
              : post.content;
            const result = await publishToplatform(post.platform, fullContent, {
              facebookPageId: socialConfig?.facebookPageId,
              facebookAccessToken: process.env.FACEBOOK_ACCESS_TOKEN,
            });
            if (result.success) {
              campaign.posts[i].status = "published";
              campaign.posts[i].publishedAt = new Date().toISOString();
            } else {
              campaign.posts[i].status = "failed";
            }
            results.push({ platform: post.platform, success: result.success, error: result.error });
          }
        } catch (error) {
          campaign.posts[i].status = "failed";
          results.push({
            platform: post.platform,
            success: false,
            error: error instanceof Error ? error.message : "Publish failed",
          });
        }
      }

      await db.collection("campaigns").updateOne(
        { _id: new ObjectId(campaignId) },
        { $set: { posts: campaign.posts, status: "active" } }
      );

      return NextResponse.json({ success: true, results });
    }

    if (action === "delete") {
      const { campaignId } = await req.json();
      const db = await getDb();
      await db.collection("campaigns").deleteOne({ _id: new ObjectId(campaignId) });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Campaign API error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
