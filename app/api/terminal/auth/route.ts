import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    const terminalPassword = process.env.TERMINAL_PASSWORD;
    const ttydUrl = process.env.TTYD_URL;

    if (!terminalPassword) {
      return NextResponse.json({ success: false, error: "TERMINAL_PASSWORD not configured in Vercel" }, { status: 500 });
    }

    if (password === terminalPassword) {
      return NextResponse.json({ success: true, ttydUrl: ttydUrl || null });
    }

    return NextResponse.json({ success: false, error: "Invalid password" }, { status: 401 });
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
  }
}
