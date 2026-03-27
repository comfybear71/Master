import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const correctPassword = process.env.TERMINAL_PASSWORD;
  const ttydUrl = process.env.TTYD_URL;

  if (!correctPassword) {
    return NextResponse.json({ success: false, error: "TERMINAL_PASSWORD not configured in Vercel" });
  }

  if (password !== correctPassword) {
    return NextResponse.json({ success: false, error: "Invalid password" });
  }

  return NextResponse.json({ success: true, ttydUrl });
}
