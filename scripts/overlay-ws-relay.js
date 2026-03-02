#!/usr/bin/env node
/**
 * WebSocket relay for OBS overlay updates.
 * Run this on the OBS/stream machine (e.g. node scripts/overlay-ws-relay.js).
 *
 * - Dashboard connects and sends JSON: { type: "marquee", html: "..." } or { type: "matchup", html: "..." }
 * - This server relays each message to ALL connected clients (including overlay browser sources).
 * - Overlay pages (marquee.html / matchupcard.html) receive the JSON and call updateMarquee(msg.html) or updateMatchupCard(msg.html).
 *
 * Port: 4455 (or OVERLAY_WS_PORT env). Same URL you set in the connection card (e.g. ws://192.168.0.63:4455).
 */

const { WebSocketServer } = require("ws");

const PORT = Number(process.env.OVERLAY_WS_PORT) || 4455;

const wss = new WebSocketServer({ port: PORT });

wss.on("connection", (ws) => {
  console.log("Overlay client connected");

  ws.on("message", (data) => {
    // Relay: broadcast the same message to all clients (dashboard sends JSON; overlay pages receive and parse it)
    for (const client of wss.clients) {
      if (client.readyState === 1) {
        client.send(data);
      }
    }
  });
});

console.log(`Overlay WebSocket relay listening on port ${PORT}. Use ws://<this-machine-ip>:${PORT} in the connection card.`);
