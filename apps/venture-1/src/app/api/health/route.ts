import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "venture-1",
    demoMode: !process.env.OPENAI_API_KEY,
  });
}
