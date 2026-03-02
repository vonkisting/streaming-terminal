/**
 * Runs once when the Next.js server starts. Starts the marquee WebSocket
 * server on port 4455 so OBS overlay clients can receive live updates.
 */

import { startMarqueeWsServer, updateMarquee } from "@/lib/marquee-ws-server";

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    startMarqueeWsServer();
    // Example: send a test message after 2s (set MARQUEE_WS_WELCOME_MS=0 to disable)
    const welcomeMs = Number(process.env.MARQUEE_WS_WELCOME_MS);
    const delay = Number.isFinite(welcomeMs) && welcomeMs >= 0 ? welcomeMs : 2000;
    if (delay > 0) {
      setTimeout(() => updateMarquee("Welcome to the stream!"), delay);
    }
  }
}
