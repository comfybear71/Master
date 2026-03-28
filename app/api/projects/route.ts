import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { Project } from "@/lib/types";
import { ObjectId } from "mongodb";

export async function GET() {
  try {
    const db = await getDb();
    const projects = await db
      .collection("projects")
      .find({})
      .sort({ priority: 1, addedAt: -1 })
      .toArray();
    return NextResponse.json(projects);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch projects";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Clean repo field — strip full GitHub URL to owner/repo format
    let repo = (body.repo || "").trim();
    if (repo.includes("github.com/")) {
      repo = repo.replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, "").replace(/\.git$/, "");
    }

    const project: Omit<Project, "_id"> = {
      name: body.name,
      repo,
      vercelProjectId: body.vercelProjectId || "",
      stack: body.stack || "",
      category: body.category || "infrastructure",
      description: body.description || "",
      status: body.status || "active",
      liveUrl: body.liveUrl || "",
      priority: body.priority ?? 99,
      addedAt: new Date().toISOString(),
    };

    const db = await getDb();
    const result = await db.collection("projects").insertOne(project);
    return NextResponse.json({ ...project, _id: result.insertedId }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add project";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing project id" }, { status: 400 });
    }
    const db = await getDb();
    await db.collection("projects").deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete project";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json({ error: "Missing project id" }, { status: 400 });
    }

    // Clean repo field — strip full GitHub URL to owner/repo format
    if (updates.repo && updates.repo.includes("github.com/")) {
      updates.repo = updates.repo.replace(/^https?:\/\/github\.com\//, "");
      // Remove trailing slashes or .git
      updates.repo = updates.repo.replace(/\/$/, "").replace(/\.git$/, "");
    }

    const db = await getDb();
    await db.collection("projects").updateOne(
      { _id: new ObjectId(id) },
      { $set: updates }
    );

    const updated = await db.collection("projects").findOne({ _id: new ObjectId(id) });
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update project";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
