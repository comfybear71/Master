import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getRepo, getRepoFileContent, detectStack } from "@/lib/github";
import { getProjectByName } from "@/lib/vercel";

export async function POST(req: NextRequest) {
  try {
    const { repo } = await req.json();
    if (!repo || !repo.includes("/")) {
      return NextResponse.json({ error: "Invalid repo format. Use owner/repo." }, { status: 400 });
    }

    const db = await getDb();

    // Check if already registered
    const existing = await db.collection("projects").findOne({ repo });
    if (existing) {
      return NextResponse.json({ error: "Project already registered", project: existing }, { status: 409 });
    }

    // 1. Fetch repo info from GitHub
    const ghRepo = await getRepo(repo);

    // 2. Read CLAUDE.md and HANDOFF.md
    let claudeMd = "";
    let handoffMd = "";
    try {
      claudeMd = await getRepoFileContent(repo, "CLAUDE.md");
    } catch {
      // no CLAUDE.md
    }
    try {
      handoffMd = await getRepoFileContent(repo, "HANDOFF.md");
    } catch {
      // no HANDOFF.md
    }

    // 3. Auto-detect stack from package.json / other markers
    const stack = await detectStack(repo);

    // 4. Detect category from CLAUDE.md or repo topics
    const category = detectCategory(claudeMd, ghRepo.description, ghRepo.topics);

    // 5. Try to find matching Vercel project
    const repoName = repo.split("/")[1];
    const vercelProject = await getProjectByName(repoName);

    // 6. Extract live URL from Vercel or CLAUDE.md
    let liveUrl = "";
    if (vercelProject) {
      liveUrl = `https://${repoName}.vercel.app`;
    }
    const urlMatch = claudeMd.match(/https?:\/\/[^\s)]+\.(?:vercel\.app|com|xyz|io)[^\s)]*/i);
    if (urlMatch) liveUrl = urlMatch[0];

    // 7. Register in MongoDB
    const project = {
      name: ghRepo.name,
      repo,
      vercelProjectId: vercelProject?.id || "",
      stack,
      category,
      description: ghRepo.description || extractDescription(claudeMd),
      status: "active" as const,
      liveUrl,
      priority: 99,
      addedAt: new Date().toISOString(),
      claudeMd: claudeMd.slice(0, 5000),
      handoffMd: handoffMd.slice(0, 5000),
      defaultBranch: ghRepo.default_branch,
    };

    const result = await db.collection("projects").insertOne(project);

    return NextResponse.json({
      success: true,
      project: { ...project, _id: result.insertedId },
      detected: {
        stack,
        category,
        hasCLAUDEmd: !!claudeMd,
        hasHANDOFFmd: !!handoffMd,
        vercelLinked: !!vercelProject,
        liveUrl,
      },
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Onboarding failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function detectCategory(
  claudeMd: string,
  description: string | null,
  topics?: string[]
): "ecommerce" | "trading" | "education" | "marketing" | "infrastructure" {
  const text = `${claudeMd} ${description || ""} ${(topics || []).join(" ")}`.toLowerCase();

  if (text.includes("trading") || text.includes("bot") || text.includes("forex") || text.includes("crypto")) {
    return "trading";
  }
  if (text.includes("ecommerce") || text.includes("e-commerce") || text.includes("shop") || text.includes("dropship") || text.includes("store")) {
    return "ecommerce";
  }
  if (text.includes("education") || text.includes("edtech") || text.includes("learn") || text.includes("math") || text.includes("tutor")) {
    return "education";
  }
  if (text.includes("marketing") || text.includes("social") || text.includes("campaign") || text.includes("growth")) {
    return "marketing";
  }
  return "infrastructure";
}

function extractDescription(claudeMd: string): string {
  const lines = claudeMd.split("\n").filter((l) => l.trim());
  for (const line of lines) {
    if (line.startsWith("#")) continue;
    if (line.startsWith(">")) continue;
    if (line.startsWith("-")) continue;
    if (line.startsWith("|")) continue;
    if (line.trim().length > 20) return line.trim().slice(0, 200);
  }
  return "";
}
