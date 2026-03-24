import { NextRequest, NextResponse } from "next/server";
import { listRepos, getRepoCommits, getRepoFileContent, getRepoIssues } from "@/lib/github";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  try {
    switch (action) {
      case "repos": {
        const repos = await listRepos();
        return NextResponse.json(repos);
      }
      case "commits": {
        const repo = searchParams.get("repo");
        if (!repo) return NextResponse.json({ error: "Missing repo param" }, { status: 400 });
        const commits = await getRepoCommits(repo);
        return NextResponse.json(commits);
      }
      case "file": {
        const repo = searchParams.get("repo");
        const path = searchParams.get("path");
        if (!repo || !path) {
          return NextResponse.json({ error: "Missing repo or path" }, { status: 400 });
        }
        const content = await getRepoFileContent(repo, path);
        return NextResponse.json({ content });
      }
      case "issues": {
        const repo = searchParams.get("repo");
        if (!repo) return NextResponse.json({ error: "Missing repo param" }, { status: 400 });
        const issues = await getRepoIssues(repo);
        return NextResponse.json(issues);
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "GitHub API error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
