// Aegis — multiplayer relay + static file server
//   npm install
//   npm start
//
// Serves the game + WebSocket relay on one port.

const http = require("http");
const fs = require("fs");
const path = require("path");
const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 3099;

const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".ico": "image/x-icon",
};

const ROOT = path.resolve(__dirname);

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("OK");
    return;
  }

  let file = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  const ext = path.extname(file);
  const mime = MIME[ext] || "application/octet-stream";
  const filePath = path.normalize(path.join(ROOT, file));

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": mime });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server });

const rooms = new Map();
const playerIds = new Map();
const nextId = (() => {
  let n = 0;
  return () => "p" + ++n;
})();

function code() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function send(ws, obj) {
  if (ws.readyState === 1) ws.send(JSON.stringify(obj));
}

function broadcast(room, obj, exclude) {
  const peers = rooms.get(room);
  if (!peers) return;
  for (const ws2 of peers) {
    if (ws2 !== exclude) send(ws2, obj);
  }
}

function roomPlayers(room) {
  const peers = rooms.get(room);
  if (!peers) return [];
  const list = [];
  for (const w of peers) {
    const info = playerIds.get(w);
    if (info) list.push({ id: info.id });
  }
  return list;
}

wss.on("connection", (ws) => {
  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.type === "create") {
      let room;
      do {
        room = code();
      } while (rooms.has(room));
      rooms.set(room, new Set([ws]));
      const id = nextId();
      playerIds.set(ws, { room, id });
      send(ws, { type: "created", room, id, players: roomPlayers(room) });
    } else if (msg.type === "join") {
      const room = String(msg.room || "")
        .toUpperCase()
        .trim();
      if (!rooms.has(room)) {
        send(ws, { type: "error", msg: "Room not found." });
        return;
      }
      const peers = rooms.get(room);
      if (peers.size >= 6) {
        send(ws, { type: "error", msg: "Room is full (max 6)." });
        return;
      }
      peers.add(ws);
      const id = nextId();
      playerIds.set(ws, { room, id });
      send(ws, { type: "joined", room, id, players: roomPlayers(room) });
      broadcast(room, { type: "playerJoined", id, room }, ws);
    } else if (msg.type === "state" || msg.type === "bullet" || msg.type === "event" || msg.type === "ready" || msg.type === "start") {
      const info = playerIds.get(ws);
      if (!info) return;
      if (msg.type === "start") {
        const peers = rooms.get(info.room);
        if (!peers) return;
        const ids = Array.from(peers)
          .map((w) => playerIds.get(w) && playerIds.get(w).id)
          .filter(Boolean);
        broadcast(info.room, { type: "start", host: ids[0] });
        return;
      }
      broadcast(info.room, { type: msg.type, id: info.id, data: msg.data }, msg.type === "ready" || msg.type === "event" ? undefined : ws);
    }
  });

  ws.on("close", () => {
    const info = playerIds.get(ws);
    if (info && info.room) {
      const peers = rooms.get(info.room);
      if (peers) {
        peers.delete(ws);
        broadcast(info.room, { type: "playerLeft", id: info.id }, ws);
        if (peers.size === 0) rooms.delete(info.room);
      }
    }
    playerIds.delete(ws);
  });

  ws.on("error", () => {});
});

server.listen(PORT, () => {
  console.log("Aegis  http://localhost:" + PORT);
});
