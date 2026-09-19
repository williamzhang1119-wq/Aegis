import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "pip",
    demoMode: !process.env.OPENAI_API_KEY,
  });
}
