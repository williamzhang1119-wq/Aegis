# Pip — kid-safe AI tutor

Pip is a Socratic tutor for children: it guides with hints and questions so kids learn how to think. It does **not** give homework answers or solutions directly.

## Features

- Tutor-first chat: hints, tiny steps, and follow-up questions
- Never spoils the final answer (even when asked “just tell me”)
- Age-appropriate system prompt (ages 5–12)
- Local blocked-topic checks + PII redaction
- OpenAI moderation on input and output when an API key is set
- Demo mode (no API key) so you can preview the tutoring UI anytime

## Local development

```bash
cd apps/pip
cp .env.example .env.local
# Optional: add OPENAI_API_KEY for live replies
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy on Railway

1. Push this repo to GitHub.
2. In [Railway](https://railway.app), **New Project → Deploy from GitHub**.
3. Set the service **Root Directory** to `apps/pip`.
4. Railway will build using the included `Dockerfile`.
5. Add variables:
   - `OPENAI_API_KEY` — your OpenAI key (omit for demo mode)
   - `OPENAI_MODEL` — optional, defaults to `gpt-4o-mini`
6. Generate a public domain under **Settings → Networking → Public Networking**.
7. Confirm `GET /api/health` returns `{ "ok": true }`.

### CLI alternative

```bash
cd apps/pip
npm i -g @railway/cli
railway login
railway init
railway variables set OPENAI_API_KEY=sk-...
railway up
railway domain
```

## Safety notes

- Pip refuses adult, violent, and self-harm topics.
- Pip never asks for personal details (address, phone, school, etc.).
- Pip tutors with hints — it does not give final answers or completed homework.
- Parents should supervise younger children online.
- Demo mode uses canned tutoring replies and does not call a model.

## Scripts

| Command        | Description              |
| -------------- | ------------------------ |
| `npm run dev`  | Local development server |
| `npm run build`| Production build         |
| `npm start`    | Start production server  |
| `npm run lint` | Lint                     |
