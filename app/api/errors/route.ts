import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { listDeployments, getErrorLogs } from "@/lib/vercel";
import { DetectedError } from "@/lib/types";

export async function GET() {
  try {
    const db = await getDb();
    const errors = await db
      .collection<DetectedError>("errors")
      .find({})
      .sort({ detectedAt: -1 })
      .limit(50)
      .toArray();
    return NextResponse.json(errors);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch errors";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  try {
    if (action === "scan") {
      return await scanForErrors();
    }
    if (action === "dismiss") {
      const { errorId } = await req.json();
      const db = await getDb();
      const { ObjectId } = await import("mongodb");
      await db.collection("errors").updateOne(
        { _id: new ObjectId(errorId) },
        { $set: { status: "dismissed" } }
      );
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error scanning failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function scanForErrors() {
  const db = await getDb();
  const projects = await db.collection("projects").find({}).toArray();
  const newErrors: DetectedError[] = [];

  for (const project of projects) {
    try {
      const deployments = await listDeployments(project.vercelProjectId || undefined, 3);
      const failedDeploys = deployments.filter((d) => d.state === "ERROR");

      for (const deploy of failedDeploys) {
        const existing = await db.collection("errors").findOne({
          deploymentId: deploy.uid,
        });
        if (existing) continue;

        let errorLog = "";
        try {
          errorLog = await getErrorLogs(deploy.uid);
        } catch {
          errorLog = `Deployment ${deploy.uid} failed with state ERROR. Unable to fetch detailed logs.`;
        }

        if (!errorLog) {
          errorLog = `Deployment ${deploy.uid} failed with state ERROR. No specific error lines found in build logs.`;
        }

        const errorDoc = {
          projectId: String(project._id),
          projectName: project.name,
          repo: project.repo,
          deploymentId: deploy.uid,
          deploymentUrl: deploy.url || "",
          errorLog,
          detectedAt: new Date().toISOString(),
          status: "new" as const,
        };

        const result = await db.collection("errors").insertOne(errorDoc);
        newErrors.push({ ...errorDoc, _id: String(result.insertedId) });
      }
    } catch {
      // skip project if Vercel fetch fails
    }
  }

  return NextResponse.json({
    scanned: projects.length,
    newErrors: newErrors.length,
    errors: newErrors,
  });
}
