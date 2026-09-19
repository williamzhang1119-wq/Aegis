import { VENTURE_SYSTEM_PROMPT } from "./prompts";

export type ChatTurn = { role: "user" | "assistant"; content: string };

export function isDemoMode(): boolean {
  return !process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY;
}

export function demoReply(userText: string): string {
  const lower = userText.toLowerCase();

  if (
    /\b(just )?tell me( the)? answer\b/.test(lower) ||
    /\bi give up\b/.test(lower)
  ) {
    return "Okay — since you asked straight-up: let's unlock it together. What's the very last step you already figured out? I'll fill in only that missing piece, then you finish the thought.";
  }

  if (lower.includes("sky") || lower.includes("blue")) {
    return "Great explorer question! Sunlight has lots of colors mixed together. Which color do you think air bounces around the most — red, green, or blue?";
  }

  if (lower.includes("12") && (lower.includes("8") || lower.includes("x") || lower.includes("×"))) {
    return "Math adventure! Before the answer: what does 12 × 8 mean in plain words? Try thinking of 12 groups of something — what number would that something be?";
  }

  if (lower.includes("computer") || lower.includes("code")) {
    return "Computers are like super-fast rule followers. If a computer only understands yes/no choices, what do you think a 'program' is made of — ideas, instructions, or electricity?";
  }

  if (lower.includes("dino")) {
    return "Dino detective mode! Scientists think something big changed Earth's climate long ago. What kinds of clues would YOU look for — rocks, fossils, or both?";
  }

  if (lower.includes("dream")) {
    return "Dreams are mysterious! When you're asleep, your brain is still busy. What do YOU notice most in dreams — stories, feelings, or weird mash-ups of both?";
  }

  if (lower.includes("money")) {
    return "Money is a tool people invented to trade. Before coins and cards, people swapped things. What problem does money solve that swapping apples for shoes might not?";
  }

  return "Ooh, let's explore that! Tell me what you already know or guess about it — even a wild guess helps us start the adventure.";
}

export function demoQuizJson(): string {
  return JSON.stringify([
    {
      question: "Why does the sky look blue on a clear day?",
      options: [
        "The ocean paints it",
        "Air scatters blue light most",
        "The sun is blue",
        "Clouds are blue underneath",
      ],
      correctIndex: 1,
      explanation:
        "Sunlight has many colors. Tiny bits of air scatter blue light more than other colors, so we see a blue sky.",
    },
    {
      question: "What is 7 × 6?",
      options: ["36", "42", "48", "56"],
      correctIndex: 1,
      explanation: "7 groups of 6 (or 6 groups of 7) make 42.",
    },
    {
      question: "Which planet is known as the Red Planet?",
      options: ["Venus", "Jupiter", "Mars", "Mercury"],
      correctIndex: 2,
      explanation: "Mars looks reddish because of iron-rich dust on its surface.",
    },
    {
      question: "What do plants need to make food using sunlight?",
      options: [
        "Only water",
        "Only soil",
        "Sunlight, water, and air (carbon dioxide)",
        "Only darkness",
      ],
      correctIndex: 2,
      explanation:
        "Photosynthesis uses sunlight, water, and carbon dioxide to make food for the plant.",
    },
  ]);
}

async function chatWithAnthropic(options: {
  apiKey: string;
  model: string;
  system: string;
  messages: ChatTurn[];
  maxTokens: number;
}): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": options.apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options.model,
      max_tokens: options.maxTokens,
      system: options.system,
      messages: options.messages.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    }),
  });

  const data = (await res.json()) as {
    content?: Array<{ type?: string; text?: string }>;
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(data.error?.message || `Anthropic error (${res.status})`);
  }
  const text = (data.content || [])
    .map((b) => b.text || "")
    .filter(Boolean)
    .join("\n")
    .trim();
  if (!text) throw new Error("Empty model response");
  return text;
}

async function chatWithOpenAI(options: {
  apiKey: string;
  model: string;
  system: string;
  messages: ChatTurn[];
  maxTokens: number;
}): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options.model,
      temperature: 0.6,
      max_tokens: options.maxTokens,
      messages: [
        { role: "system", content: options.system },
        ...options.messages,
      ],
    }),
  });

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(data.error?.message || `OpenAI error (${res.status})`);
  }
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Empty model response");
  return content;
}

export async function generateReply(options: {
  system?: string;
  messages: ChatTurn[];
  maxTokens?: number;
  model?: string;
}): Promise<{ text: string; demo: boolean; provider: string }> {
  const system = options.system || VENTURE_SYSTEM_PROMPT;
  const maxTokens = options.maxTokens || 1200;
  const messages = options.messages.slice(-16);

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    const model = options.model || process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
    const text = await chatWithAnthropic({
      apiKey: anthropicKey,
      model,
      system,
      messages,
      maxTokens,
    });
    return { text, demo: false, provider: "anthropic" };
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const text = await chatWithOpenAI({
      apiKey: openaiKey,
      model,
      system,
      messages,
      maxTokens,
    });
    return { text, demo: false, provider: "openai" };
  }

  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content || "";
  const isQuiz =
    system.toLowerCase().includes("quiz") ||
    lastUser.toLowerCase().includes("generate the quiz");
  return {
    text: isQuiz ? demoQuizJson() : demoReply(lastUser),
    demo: true,
    provider: "demo",
  };
}
