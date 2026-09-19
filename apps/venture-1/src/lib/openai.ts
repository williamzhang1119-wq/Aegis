import { VENTURE_SYSTEM_PROMPT } from "./prompts";

export type ChatTurn = { role: "user" | "assistant"; content: string };

type OpenAIChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

const DEMO_REPLIES = [
  "I'm Venture 1, your tutor! I won't spoil the answer — I'll help you find it. What are you working on?",
  "Nice question! Before we dig in: what do you already think might be true? Tell me your best guess.",
  "Let's take one tiny step. What part of the problem feels trickiest right now?",
  "Here's a hint-shaped question: what clue words jump out at you? Then we'll try the next step together.",
];

export function isDemoMode(apiKey?: string): boolean {
  return !apiKey;
}

export function demoReply(userText: string): string {
  const lower = userText.toLowerCase();

  if (
    /\b(just )?tell me( the)? answer\b/.test(lower) ||
    /\bwhat('?s| is) the answer\b/.test(lower) ||
    /\bgive me the (answer|solution)\b/.test(lower)
  ) {
    return "I won't hand you the answer — that steals your brain's workout! Here's a hint instead: look for the most important clue in the question. What do you notice first?";
  }

  if (lower.includes("story")) {
    return "Let's invent a story together. You pick the hero — animal, kid, or robot? Once you choose, I'll ask what happens next.";
  }

  if (lower.includes("sky") || lower.includes("blue")) {
    return "Great science mystery! First clue: sunlight has many colors mixed together. Which color do you think air scatters the most — red, green, or blue?";
  }

  if (lower.includes("math") || lower.includes("homework") || /\d+\s*[+\-×x*÷/]\s*\d+/.test(lower)) {
    return "Homework mode! I won't solve it for you. Start by telling me: what is the question asking you to find? Then we'll pick the first small step.";
  }

  if (lower.includes("space") || lower.includes("planet")) {
    return "Space adventure! Before facts: if you stood on a new planet, what would you check first — sky color, gravity, or temperature? Why that one?";
  }

  if (lower.includes("dino")) {
    return "Dino detective time! Some were huge, some tiny. Do you think today's birds are more like cousins of dinosaurs, or totally unrelated? What's your guess?";
  }

  if (lower.includes("riddle")) {
    return "Riddle time — you solve it. I have cities but no houses, forests but no trees, and water but no fish. What could I be? Take a guess!";
  }

  return DEMO_REPLIES[Math.floor(Math.random() * DEMO_REPLIES.length)];
}

export async function chatWithOpenAI(options: {
  apiKey: string;
  model: string;
  messages: ChatTurn[];
}): Promise<string> {
  const { apiKey, model, messages } = options;
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.6,
      max_tokens: 450,
      messages: [{ role: "system", content: VENTURE_SYSTEM_PROMPT }, ...messages],
    }),
  });

  const data = (await res.json()) as OpenAIChatResponse;
  if (!res.ok) {
    throw new Error(data.error?.message || `OpenAI error (${res.status})`);
  }
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Empty model response");
  return content;
}
