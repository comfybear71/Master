import { NextRequest, NextResponse } from "next/server";
import { listProjects, listDeployments, triggerRedeploy, getBuildLogs, getErrorLogs } from "@/lib/vercel";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  try {
    switch (action) {
      case "projects": {
        const projects = await listProjects();
        return NextResponse.json(projects);
      }
      case "deployments": {
        const projectId = searchParams.get("projectId") || undefined;
        const limit = parseInt(searchParams.get("limit") || "10");
        const deployments = await listDeployments(projectId, limit);
        return NextResponse.json(deployments);
      }
      case "build-logs": {
        const deploymentId = searchParams.get("deploymentId");
        if (!deploymentId) return NextResponse.json({ error: "Missing deploymentId" }, { status: 400 });
        const logs = await getBuildLogs(deploymentId);
        return NextResponse.json({ logs });
      }
      case "error-logs": {
        const deploymentId = searchParams.get("deploymentId");
        if (!deploymentId) return NextResponse.json({ error: "Missing deploymentId" }, { status: 400 });
        const errors = await getErrorLogs(deploymentId);
        return NextResponse.json({ errors });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Vercel API error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action, deploymentId } = await req.json();
    if (action === "redeploy" && deploymentId) {
      const result = await triggerRedeploy(deploymentId);
      return NextResponse.json(result);
    }
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Vercel API error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
