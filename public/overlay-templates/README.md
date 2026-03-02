# Overlay templates (updateMarquee / updateMatchupCard)

These are **reference copies** of the overlay HTML files that include the WebSocket client and the `updateMarquee` / `updateMatchupCard` functions. Use them to restore or deploy to https://stream.poolhub.us if the live files were overwritten.

- **marquee-template.html** — Copy to `marquee.html` on your server. Contains `updateMarquee(html)` and connects to `ws://stream.poolhub.us:4455`.
- **matchupcard-template.html** — Copy to `matchupcard.html` on your server. Contains `updateMatchupCard(html)` and connects to `ws://stream.poolhub.us:4455`.

**To restore on stream.poolhub.us:**

1. Copy `marquee-template.html` to `marquee.html` and `matchupcard-template.html` to `matchupcard.html` (e.g. via FTP or your deploy process).
2. Ensure the WebSocket server on stream.poolhub.us is running on port 4455 and relays messages to all connected clients.
3. In this app, set `NEXT_PUBLIC_OVERLAY_WS_URL=ws://stream.poolhub.us:4455` so the dashboard pushes updates to that server.

The dashboard will then send marquee and matchup HTML over the WebSocket; these pages will receive it and update only the container innerHTML (no full reload).
