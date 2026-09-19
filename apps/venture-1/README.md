# Venture 1 — kid-safe AI tutor

Every question is an adventure. Venture 1 guides kids with hints and questions — it does not hand over answers right away.

Matches the experience at [venture1.up.railway.app](https://venture1.up.railway.app): compass mascot, explorer meter, passport stamps, Quiz Me, voice input/read-aloud, and Socratic tutoring.

## Local development

```bash
cd apps/venture-1
cp .env.example .env.local
# Optional: ANTHROPIC_API_KEY (preferred) or OPENAI_API_KEY
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Without an API key, demo mode still works for chat + quizzes.

## Deploy on Railway

1. Root Directory: `apps/venture-1`
2. Variables:
   - `ANTHROPIC_API_KEY` (preferred, Claude)
   - or `OPENAI_API_KEY`
3. Public networking → open the generated URL

## Features

- Socratic tutor prompt (ages 5–18)
- Passport topic badges
- Curiosity / explorer meter
- Quiz Me
- Mic input + read-aloud (browser support)
- Safety filters + optional OpenAI moderation
