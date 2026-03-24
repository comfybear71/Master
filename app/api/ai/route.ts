import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { analyzeError } from "@/lib/ai";
import { getRepoFileContent, createOrUpdateFile } from "@/lib/github";
import { triggerRedeploy } from "@/lib/vercel";
import { ObjectId } from "mongodb";

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  try {
    switch (action) {
      case "analyze":
        return await handleAnalyze(req);
      case "apply-fix":
        return await handleApplyFix(req);
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI API error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function handleAnalyze(req: NextRequest) {
  const { errorId } = await req.json();
  const db = await getDb();
  const errorDoc = await db.collection("errors").findOne({ _id: new ObjectId(errorId) });

  if (!errorDoc) {
    return NextResponse.json({ error: "Error not found" }, { status: 404 });
  }

  await db.collection("errors").updateOne(
    { _id: new ObjectId(errorId) },
    { $set: { status: "analyzing" } }
  );

  let claudeMd = "";
  try {
    claudeMd = await getRepoFileContent(errorDoc.repo, "CLAUDE.md");
  } catch {
    claudeMd = `Project: ${errorDoc.projectName}\nRepo: ${errorDoc.repo}`;
  }

  const analysis = await analyzeError(errorDoc.errorLog, claudeMd);

  await db.collection("errors").updateOne(
    { _id: new ObjectId(errorId) },
    {
      $set: {
        status: "fix_ready",
        diagnosis: analysis.diagnosis,
        suggestedFix: analysis.suggestedFix,
        fixFilePath: analysis.filePath,
        fixConfidence: analysis.confidence,
      },
    }
  );

  return NextResponse.json({
    errorId,
    diagnosis: analysis.diagnosis,
    suggestedFix: analysis.suggestedFix,
    filePath: analysis.filePath,
    confidence: analysis.confidence,
  });
}

async function handleApplyFix(req: NextRequest) {
  const { errorId } = await req.json();
  const db = await getDb();
  const errorDoc = await db.collection("errors").findOne({ _id: new ObjectId(errorId) });

  if (!errorDoc) {
    return NextResponse.json({ error: "Error not found" }, { status: 404 });
  }

  if (errorDoc.status !== "fix_ready") {
    return NextResponse.json({ error: "No fix ready for this error" }, { status: 400 });
  }

  // Check if this is a trading project — refuse without explicit confirmation
  const project = await db.collection("projects").findOne({ _id: new ObjectId(errorDoc.projectId) });
  if (project?.category === "trading") {
    return NextResponse.json(
      { error: "Cannot auto-apply fixes to trading projects. Apply manually." },
      { status: 403 }
    );
  }

  // Apply the fix via GitHub API
  const commitResult = await createOrUpdateFile(
    errorDoc.repo,
    errorDoc.fixFilePath,
    errorDoc.suggestedFix,
    `fix: ${errorDoc.diagnosis?.slice(0, 72)}\n\nAuto-fix applied by TheMaster AI Orchestrator.\nError ID: ${errorId}`
  );

  // Update HANDOFF.md for the project
  try {
    let handoff = "";
    try {
      handoff = await getRepoFileContent(errorDoc.repo, "HANDOFF.md");
    } catch {
      handoff = "# HANDOFF.md\n\n## Fix Log\n";
    }

    const fixEntry = `\n| ${new Date().toISOString().split("T")[0]} | Auto-fix: ${errorDoc.diagnosis?.slice(0, 80)} | TheMaster AI |`;
    const updatedHandoff = handoff.includes("Session Log")
      ? handoff.replace(
          /(## Session Log[\s\S]*?\|[\s\S]*?\|[\s\S]*?\|[\s\S]*?\|)/,
          `$1${fixEntry}`
        )
      : handoff + `\n\n## Auto-Fix Log\n\n| Date | Fix | Applied By |\n|---|---|---|\n${fixEntry}\n`;

    await createOrUpdateFile(
      errorDoc.repo,
      "HANDOFF.md",
      updatedHandoff,
      `docs: update HANDOFF.md with auto-fix log\n\nTheMaster AI Orchestrator`
    );
  } catch {
    // non-critical — don't fail the fix if HANDOFF update fails
  }

  // Trigger Vercel redeploy
  let redeployResult = null;
  try {
    redeployResult = await triggerRedeploy(errorDoc.deploymentId);
  } catch {
    // redeploy may not work if Vercel auto-deploys on push — that's fine
  }

  await db.collection("errors").updateOne(
    { _id: new ObjectId(errorId) },
    {
      $set: {
        status: "fix_applied",
        fixAppliedAt: new Date().toISOString(),
        commitSha: commitResult.commitSha,
      },
    }
  );

  return NextResponse.json({
    success: true,
    commitSha: commitResult.commitSha,
    redeployed: !!redeployResult,
  });
}
