import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { UptimeCheck } from "@/lib/types";

export async function GET() {
  try {
    const db = await getDb();

    // Get latest check for each project
    const latestChecks = await db
      .collection<UptimeCheck>("uptime")
      .aggregate([
        { $sort: { checkedAt: -1 } },
        { $group: { _id: "$projectId", doc: { $first: "$$ROOT" } } },
        { $replaceRoot: { newRoot: "$doc" } },
      ])
      .toArray();

    return NextResponse.json(latestChecks);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Uptime check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const db = await getDb();
    const projects = await db.collection("projects").find({ liveUrl: { $ne: "" } }).toArray();
    const results: UptimeCheck[] = [];

    for (const project of projects) {
      if (!project.liveUrl) continue;

      const start = Date.now();
      let status: "up" | "down" = "down";
      let statusCode: number | null = null;
      let responseTimeMs: number | null = null;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(project.liveUrl, {
          method: "HEAD",
          signal: controller.signal,
          redirect: "follow",
        });
        clearTimeout(timeout);
        statusCode = res.status;
        responseTimeMs = Date.now() - start;
        status = res.ok ? "up" : "down";
      } catch {
        responseTimeMs = Date.now() - start;
        status = "down";
      }

      const check: Omit<UptimeCheck, "_id"> = {
        projectId: String(project._id),
        projectName: project.name,
        url: project.liveUrl,
        status,
        statusCode,
        responseTimeMs,
        checkedAt: new Date().toISOString(),
      };

      await db.collection("uptime").insertOne(check);
      results.push(check);
    }

    return NextResponse.json({ checked: results.length, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Uptime check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
