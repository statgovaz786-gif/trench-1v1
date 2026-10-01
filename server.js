const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();
app.use(express.static(path.join(__dirname, "public")));
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const rooms = new Map();

function send(ws, data) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
}

function broadcast(room, data) {
  for (const p of room.players) send(p.ws, data);
}

function makeRoomCode() {
  let code;
  do code = Math.random().toString(36).slice(2, 8).toUpperCase();
  while (rooms.has(code));
  return code;
}

wss.on("connection", ws => {
  let room = null, player = null;

  ws.on("message", raw => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === "create") {
      const code = makeRoomCode();
      room = { code, players: [], state: { units: [] } };
      rooms.set(code, room);
      player = { ws, side: "blue" };
      room.players.push(player);
      send(ws, { type:"created", code, side:"blue" });
      return;
    }

    if (msg.type === "join") {
      const r = rooms.get(String(msg.code || "").toUpperCase());
      if (!r) return send(ws, { type:"error", message:"Otaq tapılmadı." });
      if (r.players.length >= 2) return send(ws, { type:"error", message:"Otaq doludur." });
      room = r;
      player = { ws, side:"red" };
      room.players.push(player);
      send(ws, { type:"joined", code:r.code, side:"red" });
      broadcast(r, { type:"start", players:r.players.map(p=>p.side) });
      return;
    }

    if (!room || !player) return;

    if (msg.type === "state") {
      room.state = msg.state;
      for (const p of room.players) {
        if (p !== player) send(p.ws, { type:"state", state:room.state });
      }
    }
  });

  ws.on("close", () => {
    if (!room) return;
    room.players = room.players.filter(p => p.ws !== ws);
    for (const p of room.players) send(p.ws, { type:"opponent_left" });
    if (room.players.length === 0) rooms.delete(room.code);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Trench 1v1 running on port ${PORT}`));