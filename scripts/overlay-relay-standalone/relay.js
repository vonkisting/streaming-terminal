#!/usr/bin/env node
/**
 * WebSocket relay for OBS overlay updates.
 * Copy this folder to the OBS machine, then: npm install && node relay.js
 *
 * Port: 4455 (or set OVERLAY_WS_PORT=8080 for port 8080).
 * Use ws://<OBS-machine-ip>:<port> in the dashboard Overlay URL and in marquee.html.
 */

const { WebSocketServer } = require("ws");

const PORT = Number(process.env.OVERLAY_WS_PORT) || 4455;

const wss = new WebSocketServer({ port: PORT });

wss.on("connection", (ws) => {
  console.log("Overlay client connected");

  ws.on("message", (data) => {
    for (const client of wss.clients) {
      if (client.readyState === 1) {
        client.send(data);
      }
    }
  });
});

console.log(`Overlay WebSocket relay listening on port ${PORT}. Use ws://<this-machine-ip>:${PORT} in the connection card.`);
