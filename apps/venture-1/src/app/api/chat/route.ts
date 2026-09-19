import { NextResponse } from "next/server";
import { generateReply, streamReply, type ChatTurn } from "@/lib/openai";
import {
  REFUSAL_MESSAGE,
  buildSystemPrompt,
  type AgeBand,
} from "@/lib/prompts";
import { moderateWithOpenAI, redactPii, sanitizeUserMessage } from "@/lib/safety";

export const runtime = "nodejs";

type Body = {
  message?: string;
  history?: ChatTurn[];
  messages?: ChatTurn[];
  system?: string;
  model?: string;
  max_tokens?: number;
  ageBand?: AgeBand;
  attemptLevel?: number;
  topicFocus?: string;
  stream?: boolean;
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
  const limit = 40;
  const bucket = rateBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

function anthropicShape(text: string, extra: Record<string, unknown> = {}) {
  return {
    content: [{ type: "text", text }],
    ...extra,
  };
}

function parseAgeBand(v: unknown): AgeBand | undefined {
  if (v === "little" || v === "explorer" || v === "teen") return v;
  return undefined;
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

  const ageBand = parseAgeBand(body.ageBand);
  const attemptLevel =
    typeof body.attemptLevel === "number"
      ? Math.max(1, Math.min(5, Math.floor(body.attemptLevel)))
      : 1;
  const topicFocus =
    typeof body.topicFocus === "string" ? body.topicFocus.slice(0, 80) : undefined;

  const system =
    typeof body.system === "string" && body.system.trim()
      ? body.system.slice(0, 12000)
      : buildSystemPrompt({ ageBand, attemptLevel, topicFocus });

  let messages: ChatTurn[] = [];
  if (Array.isArray(body.messages) && body.messages.length) {
    messages = body.messages
      .filter(
        (m): m is ChatTurn =>
          !!m &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string",
      )
      .slice(-16)
      .map((m) => ({
        role: m.role,
        content: redactPii(m.content).slice(0, 2000),
      }));
  } else {
    const sanitized = sanitizeUserMessage(body.message ?? "");
    if (!sanitized.ok) {
      if (sanitized.reason === "blocked") {
        return NextResponse.json(
          anthropicShape(REFUSAL_MESSAGE, { refused: true, reply: REFUSAL_MESSAGE }),
        );
      }
      if (sanitized.reason === "too_long") {
        return NextResponse.json(
          { error: "That message is a bit long. Try a shorter question!" },
          { status: 400 },
        );
      }
      return NextResponse.json({ error: "Please type a message." }, { status: 400 });
    }
    const history = Array.isArray(body.history)
      ? body.history
          .filter(
            (m): m is ChatTurn =>
              !!m &&
              (m.role === "user" || m.role === "assistant") &&
              typeof m.content === "string",
          )
          .slice(-8)
          .map((m) => ({
            role: m.role,
            content: redactPii(m.content).slice(0, 800),
          }))
      : [];
    messages = [...history, { role: "user", content: redactPii(sanitized.text) }];
  }

  if (!messages.length) {
    return NextResponse.json({ error: "Please type a message." }, { status: 400 });
  }

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (lastUser) {
    const check = sanitizeUserMessage(lastUser.content.slice(0, 800));
    if (!check.ok && check.reason === "blocked") {
      return NextResponse.json(
        anthropicShape(REFUSAL_MESSAGE, { refused: true, reply: REFUSAL_MESSAGE }),
      );
    }
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey && lastUser) {
    const moderation = await moderateWithOpenAI(lastUser.content, openaiKey);
    if (moderation.flagged) {
      return NextResponse.json(
        anthropicShape(REFUSAL_MESSAGE, { refused: true, reply: REFUSAL_MESSAGE }),
      );
    }
  }

  const wantStream =
    body.stream === true || req.headers.get("accept")?.includes("text/event-stream");

  if (wantStream) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (obj: unknown) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        };
        try {
          const result = await streamReply(
            {
              system,
              messages,
              maxTokens: typeof body.max_tokens === "number" ? body.max_tokens : 1200,
              model: typeof body.model === "string" ? body.model : undefined,
              ageBand,
              attemptLevel,
              topicFocus,
            },
            (delta) => send({ type: "delta", text: delta }),
          );
          if (openaiKey && !result.demo) {
            const outMod = await moderateWithOpenAI(result.text, openaiKey);
            if (outMod.flagged) {
              send({ type: "done", text: REFUSAL_MESSAGE, refused: true, demo: false });
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
              return;
            }
          }
          send({
            type: "done",
            text: result.text,
            demo: result.demo,
            provider: result.provider,
            attemptLevel,
          });
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          const message = err instanceof Error ? err.message : "Chat failed";
          send({ type: "error", error: message });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  try {
    const result = await generateReply({
      system,
      messages,
      maxTokens: typeof body.max_tokens === "number" ? body.max_tokens : 1200,
      model: typeof body.model === "string" ? body.model : undefined,
      ageBand,
      attemptLevel,
      topicFocus,
    });

    if (openaiKey && !result.demo) {
      const outMod = await moderateWithOpenAI(result.text, openaiKey);
      if (outMod.flagged) {
        return NextResponse.json(
          anthropicShape(REFUSAL_MESSAGE, { refused: true, reply: REFUSAL_MESSAGE }),
        );
      }
    }

    return NextResponse.json(
      anthropicShape(result.text, {
        reply: result.text,
        demo: result.demo,
        provider: result.provider,
        attemptLevel,
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Chat failed";
    return NextResponse.json(
      { error: `Venture 1 got a little tangled: ${message}` },
      { status: 502 },
    );
  }
}
