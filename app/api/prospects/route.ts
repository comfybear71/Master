import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { generateSponsorEmail } from "@/lib/ai";
import { ObjectId } from "mongodb";
import prospectData from "@/lib/prospect-data.json";

export interface Prospect {
  _id?: string;
  company: string;
  industry: string;
  subCategory: string;
  website: string;
  linkedinTitle: string;
  email: string;
  country: string;
  notes: string;
  status: "new" | "contacted" | "replied" | "meeting" | "closed" | "rejected" | "not_interested";
  followUpDate: string | null;
  lastContactedAt: string | null;
  emailsSent: number;
  createdAt: string;
}

// GET — list prospects with optional filters
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  try {
    const db = await getDb();

    if (action === "import") {
      // Import from bundled JSON data (parsed from Excel at build time)
      let imported = 0;
      let skipped = 0;

      for (const row of prospectData) {
        const company = (row.company || "").trim();
        if (!company) continue;

        const existing = await db.collection("prospects").findOne({ company });
        if (existing) {
          skipped++;
          continue;
        }

        const prospect: Omit<Prospect, "_id"> = {
          company,
          industry: (row.industry || "").trim(),
          subCategory: (row.subCategory || "").trim(),
          website: (row.website || "").trim(),
          linkedinTitle: (row.linkedinTitle || "").trim(),
          email: (row.email || "").trim(),
          country: (row.country || "").trim(),
          notes: (row.notes || "").trim(),
          status: "new",
          followUpDate: null,
          lastContactedAt: null,
          emailsSent: 0,
          createdAt: new Date().toISOString(),
        };

        await db.collection("prospects").insertOne(prospect);
        imported++;
      }

      return NextResponse.json({ imported, skipped, total: prospectData.length });
    }

    if (action === "stats") {
      const total = await db.collection("prospects").countDocuments();
      const byStatus = await db.collection("prospects").aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]).toArray();
      const byIndustry = await db.collection("prospects").aggregate([
        { $group: { _id: "$industry", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]).toArray();

      return NextResponse.json({
        total,
        byStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.count])),
        byIndustry: byIndustry.map((i) => ({ industry: i._id, count: i.count })),
      });
    }

    // Default: list with filters
    const status = searchParams.get("status");
    const industry = searchParams.get("industry");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = parseInt(searchParams.get("skip") || "0");

    const filter: Record<string, unknown> = {};
    if (status && status !== "all") filter.status = status;
    if (industry && industry !== "all") filter.industry = industry;
    if (search) {
      filter.$or = [
        { company: { $regex: search, $options: "i" } },
        { industry: { $regex: search, $options: "i" } },
        { notes: { $regex: search, $options: "i" } },
      ];
    }

    const prospects = await db
      .collection("prospects")
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await db.collection("prospects").countDocuments(filter);

    return NextResponse.json({ prospects, total, skip, limit });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Prospects API error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST — update status, send email, bulk actions
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  try {
    const db = await getDb();
    const body = await req.json().catch(() => ({}));

    if (action === "update-status") {
      const { prospectId, status } = body;
      await db.collection("prospects").updateOne(
        { _id: new ObjectId(prospectId) },
        { $set: { status } }
      );
      return NextResponse.json({ success: true });
    }

    if (action === "generate-email") {
      const { prospectId, tone } = body;
      const prospect = await db.collection("prospects").findOne({ _id: new ObjectId(prospectId) });
      if (!prospect) return NextResponse.json({ error: "Prospect not found" }, { status: 404 });

      // Get platform stats
      const statsData = await db.collection("social_stats").find({}).toArray();
      const platforms = statsData.map((s) => ({
        name: s.platform as string,
        followers: (s.followers as number) || 0,
        posts: (s.posts as number) || 0,
      }));
      const totalFollowers = platforms.reduce((sum, p) => sum + p.followers, 0);

      const result = await generateSponsorEmail(
        prospect.company,
        prospect.industry,
        prospect.notes || prospect.subCategory || "",
        tone || "casual",
        { totalFollowers, platforms }
      );

      // Save email to outreach_emails collection
      const email = {
        prospectId: String(prospect._id),
        companyName: prospect.company,
        industry: prospect.industry,
        contactEmail: prospect.email || "",
        ...result,
        tone: tone || "casual",
        status: "draft",
        createdAt: new Date().toISOString(),
      };
      await db.collection("outreach_emails").insertOne(email);

      return NextResponse.json({ success: true, email: result });
    }

    if (action === "mark-contacted") {
      const { prospectId } = body;
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
      return NextResponse.json({ success: true });
    }

    if (action === "bulk-generate") {
      const { prospectIds, tone } = body;
      if (!Array.isArray(prospectIds) || prospectIds.length === 0) {
        return NextResponse.json({ error: "No prospects selected" }, { status: 400 });
      }

      // Get platform stats once
      const statsData = await db.collection("social_stats").find({}).toArray();
      const platforms = statsData.map((s) => ({
        name: s.platform as string,
        followers: (s.followers as number) || 0,
        posts: (s.posts as number) || 0,
      }));
      const totalFollowers = platforms.reduce((sum, p) => sum + p.followers, 0);

      const results: Array<{ company: string; success: boolean; error?: string }> = [];

      for (const id of prospectIds.slice(0, 10)) {
        try {
          const prospect = await db.collection("prospects").findOne({ _id: new ObjectId(id) });
          if (!prospect) { results.push({ company: id, success: false, error: "Not found" }); continue; }

          const result = await generateSponsorEmail(
            prospect.company,
            prospect.industry,
            prospect.notes || prospect.subCategory || "",
            tone || "casual",
            { totalFollowers, platforms }
          );

          await db.collection("outreach_emails").insertOne({
            prospectId: String(prospect._id),
            companyName: prospect.company,
            industry: prospect.industry,
            contactEmail: prospect.email || "",
            ...result,
            tone: tone || "casual",
            status: "draft",
            createdAt: new Date().toISOString(),
          });

          results.push({ company: prospect.company, success: true });
        } catch (err) {
          results.push({ company: id, success: false, error: err instanceof Error ? err.message : "Failed" });
        }
      }

      return NextResponse.json({ success: true, results, generated: results.filter(r => r.success).length });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Prospects API error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
