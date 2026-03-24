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
    const project: Omit<Project, "_id"> = {
      name: body.name,
      repo: body.repo,
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
