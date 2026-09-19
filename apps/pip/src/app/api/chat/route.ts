import { NextResponse } from "next/server";
import { chatWithOpenAI, demoReply, isDemoMode, type ChatTurn } from "@/lib/openai";
import { REFUSAL_MESSAGE } from "@/lib/prompts";
import { moderateWithOpenAI, redactPii, sanitizeUserMessage } from "@/lib/safety";

export const runtime = "nodejs";

type Body = {
  message?: string;
  history?: ChatTurn[];
};

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function clientKey(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "anon"
  );
}

function allowRequest(key: string): boolean {
  const now = Date.now();
  const windowMs = 60_000;
  const limit = 20;
  const bucket = rateBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

export async function POST(req: Request) {
  if (!allowRequest(clientKey(req))) {
    return NextResponse.json(
      { error: "Slow down a little — too many messages. Try again in a minute." },
      { status: 429 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sanitized = sanitizeUserMessage(body.message ?? "");
  if (!sanitized.ok) {
    if (sanitized.reason === "blocked") {
      return NextResponse.json({ reply: REFUSAL_MESSAGE, refused: true });
    }
    if (sanitized.reason === "too_long") {
      return NextResponse.json(
        { error: "That message is a bit long. Try a shorter question!" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Please type a message." }, { status: 400 });
  }

  const userText = redactPii(sanitized.text);
  const history = Array.isArray(body.history)
    ? body.history
        .filter(
          (m): m is ChatTurn =>
            !!m &&
            (m.role === "user" || m.role === "assistant") &&
            typeof m.content === "string",
        )
        .slice(-8)
        .map((m) => ({ role: m.role, content: redactPii(m.content).slice(0, 800) }))
    : [];

  const apiKey = process.env.OPENAI_API_KEY;
  if (isDemoMode(apiKey)) {
    return NextResponse.json({
      reply: demoReply(userText),
      demo: true,
    });
  }

  const moderation = await moderateWithOpenAI(userText, apiKey!);
  if (moderation.flagged) {
    return NextResponse.json({ reply: REFUSAL_MESSAGE, refused: true });
  }

  try {
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const reply = await chatWithOpenAI({
      apiKey: apiKey!,
      model,
      messages: [...history, { role: "user", content: userText }],
    });
    const outMod = await moderateWithOpenAI(reply, apiKey!);
    if (outMod.flagged) {
      return NextResponse.json({ reply: REFUSAL_MESSAGE, refused: true });
    }
    return NextResponse.json({ reply: redactPii(reply), demo: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Chat failed";
    return NextResponse.json(
      { error: `Pip got a little tangled: ${message}` },
      { status: 502 },
    );
  }
}
