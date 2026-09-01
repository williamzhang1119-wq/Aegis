# Aegis

A real-time shield-defense arena — WebSocket server + HTML5 canvas client.

Hold the Aegis, shoot raiders, and survive each wave. Play solo or create a room for friends.

## Files

- **server.js** — HTTP + WebSocket game server (`ws`)
- **index.html** — Browser client with canvas rendering
- **package.json** — Node.js project config
- **render.yaml** — Render Blueprint (free web service)

## Run locally

```bash
npm install
npm start
```

Server starts at `http://localhost:3099`. Open that URL in a browser to play.

**Controls:** `WASD` move · Mouse aim · Click shoot · `Shift` or right-click raise shield

## Deploy to Render

1. This repo already has `render.yaml`
2. On Render: **New → Blueprint** and connect `williamzhang1119-wq/Aegis`
3. Render runs `npm install` and `node server.js`
