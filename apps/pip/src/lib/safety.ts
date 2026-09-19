const BLOCKED_PATTERNS: RegExp[] = [
  /\b(porn|xxx|nude|naked|sex\b|sexual|onlyfans)\b/i,
  /\b(kill\s+(yourself|myself)|suicide|self[- ]?harm|cut\s+myself)\b/i,
  /\b(make\s+a\s+bomb|build\s+a\s+gun|how\s+to\s+hack|credit\s+card\s+fraud)\b/i,
  /\b(send\s+me\s+your\s+(address|phone|password|location))\b/i,
  /\b(meet\s+me\s+(in\s+person|alone|secretly))\b/i,
];

const PII_PATTERNS: RegExp[] = [
  /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\b\d{1,5}\s+\w+\s+(street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr)\b/i,
];

export type SafetyResult =
  | { ok: true; text: string }
  | { ok: false; reason: "blocked" | "too_long" | "empty" };

export function sanitizeUserMessage(raw: string): SafetyResult {
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text) return { ok: false, reason: "empty" };
  if (text.length > 800) return { ok: false, reason: "too_long" };
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(text)) return { ok: false, reason: "blocked" };
  }
  return { ok: true, text };
}

export function redactPii(text: string): string {
  let out = text;
  for (const pattern of PII_PATTERNS) {
    out = out.replace(pattern, "[hidden]");
  }
  return out;
}

export async function moderateWithOpenAI(
  text: string,
  apiKey: string,
): Promise<{ flagged: boolean }> {
  try {
    const res = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "omni-moderation-latest",
        input: text,
      }),
    });
    if (!res.ok) {
      // Fail closed for kids if moderation is unavailable after a key was provided.
      return { flagged: true };
    }
    const data = (await res.json()) as {
      results?: Array<{ flagged?: boolean }>;
    };
    return { flagged: Boolean(data.results?.[0]?.flagged) };
  } catch {
    return { flagged: true };
  }
}
