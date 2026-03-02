/**
 * WebSocket server for marquee and matchup card live updates. OBS overlay
 * clients connect here and receive typed messages so they can update without
 * reloading. Started from instrumentation.ts when the Next.js server boots.
 */

import { WebSocketServer } from "ws";

const MARQUEE_WS_PORT = Number(process.env.MARQUEE_WS_PORT) || 4455;

let wss: WebSocketServer | null = null;

/** Message format so clients can handle marquee vs matchup without flicker. */
export type OverlayMessage =
  | { type: "marquee"; html: string }
  | {
      type: "matchup";
      html: string;
      /** Which suit ball is shown for P1 (1 or 15). Enables clients to update ball images. */
      suitsSwapped?: boolean;
      /** 1 = P1 turn (cueball below P1), 2 = P2 turn (cueball below P2). Enables clients to update cueball position. */
      whoseTurn?: 1 | 2;
    };

function broadcast(message: OverlayMessage): number {
  if (wss == null) return 0;
  const payload = JSON.stringify(message);
  let count = 0;
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(payload);
      count++;
    }
  }
  return count;
}

/** Number of overlay clients currently connected (for debugging / UI). */
export function getOverlayClientCount(): number {
  if (wss == null) return 0;
  return Array.from(wss.clients).filter((c) => c.readyState === 1).length;
}

/**
 * Start the overlay WebSocket server on port 4455 (or MARQUEE_WS_PORT).
 * Relays any message from a client to all clients (so the dashboard can connect and send; overlays receive).
 * Idempotent: does nothing if already started.
 */
export function startMarqueeWsServer(): void {
  if (wss != null) return;
  wss = new WebSocketServer({ port: MARQUEE_WS_PORT });
  wss.on("connection", (ws) => {
    console.log("OBS overlay connected");
    ws.on("message", (data: Buffer | string) => {
      for (const client of wss!.clients) {
        if (client.readyState === 1) client.send(data);
      }
    });
  });
}

/**
 * Broadcast marquee HTML to all connected clients. Returns number of clients sent to.
 */
export function updateMarquee(html: string): number {
  return broadcast({ type: "marquee", html });
}

/**
 * Broadcast matchup card HTML to all connected OBS overlay clients. Returns number of clients sent to.
 */
export function updateMatchupCard(
  html: string,
  opts?: { suitsSwapped?: boolean; whoseTurn?: 1 | 2 }
): number {
  return broadcast({
    type: "matchup",
    html,
    suitsSwapped: opts?.suitsSwapped,
    whoseTurn: opts?.whoseTurn,
  });
}
