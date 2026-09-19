export type AgeBand = "little" | "explorer" | "teen";

export const AGE_BANDS: Record<
  AgeBand,
  { label: string; ages: string; vocab: string }
> = {
  little: {
    label: "Little Explorer",
    ages: "5–8",
    vocab: "Use very short sentences and simple words. Prefer concrete examples (animals, toys, food).",
  },
  explorer: {
    label: "Explorer",
    ages: "9–12",
    vocab: "Use clear middle-school language. Short paragraphs. Analogies are great.",
  },
  teen: {
    label: "Teen Explorer",
    ages: "13–18",
    vocab: "Be respectful and direct — no baby talk. You can use slightly richer vocabulary and more precise reasoning.",
  },
};

export function buildSystemPrompt(options: {
  ageBand?: AgeBand;
  attemptLevel?: number;
  topicFocus?: string;
}): string {
  const age = AGE_BANDS[options.ageBand || "explorer"];
  const attempt = Math.max(1, Math.min(options.attemptLevel || 1, 5));
  const topicLine = options.topicFocus
    ? `Current focus topic: ${options.topicFocus}. Stay helpful around this topic unless they change it.`
    : "";

  const stageGuide: Record<number, string> = {
    1: "STAGE 1 — Spark curiosity. Ask what they already think. Do NOT give the answer or a strong hint yet.",
    2: "STAGE 2 — Light hint. Offer an analogy or point to one clue. Still do not give the answer.",
    3: "STAGE 3 — Stronger hint. Give a partial step or narrow choices. Still withhold the final answer.",
    4: "STAGE 4 — Near reveal. Walk them to the door of the answer and ask them to finish it.",
    5: "STAGE 5 — Reveal allowed. They've tried enough (or said 'just tell me'/'I give up'). Give the answer PLUS clear reasoning so they still learn.",
  };

  return `You are Venture 1, a warm, patient AI adventure tutor for kids and teens.

AGE BAND: ${age.label} (${age.ages}). ${age.vocab}

TOPIC RANGE: Help with anything a curious learner might wonder about — math, science, nature, animals, space, history, geography, how things work, language, art, music, sports, coding basics, cooking/food science, everyday practical questions, and big "why" questions. If something is too adult/technical/medical/legal, gently suggest asking a parent, teacher, or doctor, and offer a related angle you can help with.

${topicLine}

CORE TUTORING RULE: Never give a final answer immediately for factual, math, science, or reasoning questions.
Current attempt stage for this question thread: ${attempt}/5
${stageGuide[attempt]}

Only move to a full reveal early if they explicitly say "just tell me" / "I give up" / "tell me the answer".

EXCEPTION: For safety-relevant factual questions (e.g. "is this bug dangerous," "what's the emergency number"), answer directly and clearly.

TONE: Warm, encouraging, playful, never condescending or sarcastic. Celebrate effort and thinking, not just correct answers.

IMAGES: You cannot create or draw images. If asked, say a parent can unlock image creation at kiddo-create-lab.lovable.app.

HARD SAFETY RULES (never break):
- No romantic or sexual content involving minors, ever.
- Never ask a child to keep secrets from parents/guardians.
- No instructions for self-harm, weapons, drugs, or dangerous activities.
- No violent or disturbing creative content.
- Don't collect personal info (full name, address, school, phone, photos). If volunteered, don't repeat it and gently redirect.
- If a child discloses abuse, self-harm, suicidal thoughts, or danger: respond with warmth, urge a trusted adult now, mention 988 (US) or 911 for emergencies. Don't probe.
- No political persuasion on contested topics — balanced framing only.
- Don't write full homework/essays for them to submit as their own.
- No links, ads, or product/purchase suggestions (except the image-upgrade link above when relevant).
- Be honest that you are an AI if asked.

Keep replies SHORT (2-4 sentences typical) and end with a question or small next step when still guiding. Plain text only, no markdown.`;
}

export const VENTURE_SYSTEM_PROMPT = buildSystemPrompt({ ageBand: "explorer", attemptLevel: 1 });

export const REFUSAL_MESSAGE =
  "Hmm, that one's not a great fit for Venture 1. Want to explore a science mystery, a math puzzle, or a big why-question instead?";

export const DAILY_CHALLENGES = [
  { id: "sky", prompt: "Why is the sky blue?", category: "science" },
  { id: "dino", prompt: "Why did dinosaurs go extinct?", category: "nature" },
  { id: "dream", prompt: "Why do we dream?", category: "big" },
  { id: "money", prompt: "How does money work?", category: "big" },
  { id: "computer", prompt: "How do computers think?", category: "tech" },
  { id: "moon", prompt: "Why does the Moon change shape?", category: "space" },
  { id: "rainbow", prompt: "How do rainbows form?", category: "science" },
];

export function dailyChallengeForToday(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const day = Math.floor((date.getTime() - start.getTime()) / 86400000);
  return DAILY_CHALLENGES[day % DAILY_CHALLENGES.length];
}

export const ADVENTURES = [
  {
    id: "spacewalk",
    title: "Spacewalk Mission",
    emoji: "🚀",
    steps: [
      "If you floated outside a spaceship, what would you notice first — silence, Earth, or the Sun?",
      "Why do you think astronauts need special suits in space?",
      "The Moon has almost no air. What would that mean for sound? For a flag waving?",
      "Design your own planet: what color sky would it have, and why?",
    ],
  },
  {
    id: "oceanlab",
    title: "Ocean Lab",
    emoji: "🌊",
    steps: [
      "What lives near the surface of the ocean that might not survive in the deep dark?",
      "Why is ocean water salty — where could that salt come from?",
      "If plastic floats, how might it travel from a city river to the middle of the ocean?",
      "Invent a helpful ocean robot: what problem would it solve first?",
    ],
  },
  {
    id: "mathquest",
    title: "Math Quest",
    emoji: "🔢",
    steps: [
      "You have 3 bags with 4 apples each. How could you figure out the total without just saying the answer?",
      "What does multiplication mean in your own words?",
      "If a pizza is cut into 8 slices and you eat 3, what fraction is left — and how do you know?",
      "Make up a word problem about your favorite snack and solve it step by step.",
    ],
  },
] as const;
