# Overlay WebSocket relay

## Sockets vs OBS Broadcast — which to use?

**Use WebSockets (this relay).** The app is built to send overlay data over a **custom WebSocket**: the dashboard connects to your relay and sends JSON; the relay forwards it to every connected browser source; the page’s JS calls `updateMarquee(html)` / `updateMatchupCard(html)`. No OBS-specific API is required in the browser.

**OBS Broadcast** (`BroadcastCustomEvent`) would require the browser source to connect to OBS’s WebSocket and speak the obs-websocket protocol to receive events. Your static pages on stream.poolhub.us would need that client logic. The WebSocket relay approach is simpler and already implemented.

---

## Exact steps to get new data to the OBS browser source (WebSocket)

1. **Run the relay on the machine the browser sources can reach** (usually the OBS/stream machine):
   ```bash
   cd /path/to/streaming-terminal
   node scripts/overlay-ws-relay.js
   ```
   It listens on port **4455** (or set `OVERLAY_WS_PORT`).

2. **Set the overlay URL in the dashboard**  
   In the connection card, set the WebSocket URL to that relay, e.g. `ws://192.168.0.63:4455`. The dashboard uses this same URL to send overlay updates.

3. **Ensure the static overlay pages connect to the same URL**  
   The pages at `https://stream.poolhub.us/marquee.html` and `matchupcard.html` must open a WebSocket to **the same** `ws://...` (e.g. `ws://192.168.0.63:4455`) in their script. When they receive a message, they parse JSON and call `updateMarquee(msg.html)` or `updateMatchupCard(msg.html)`.

4. **Send updates from the dashboard**  
   When you save the overlay or click “Update Marquee”, the app:
   - Opens a client connection to the URL from step 2.
   - Sends `{"type":"marquee","html":"..."}` and `{"type":"matchup","html":"...", ...}`.
   - Closes the connection.  
   The relay receives those messages and sends the **same** message to every connected client (your OBS browser sources). The browser’s JS updates the DOM.

**Port note:** If OBS WebSocket (control) already uses 4455 on that machine, run the relay on another port (e.g. `OVERLAY_WS_PORT=4456 node scripts/overlay-ws-relay.js`) and use `ws://192.168.0.63:4456` in the connection card and in the overlay page scripts.

---

The dashboard sends **JSON** to your WebSocket server, for example:

```json
{"type":"marquee","html":"<div class=\"marquee-inner\">...</div>"}
{"type":"matchup","html":"<div>...</div>","suitsSwapped":false,"whoseTurn":1}
```

The overlay pages (marquee.html / matchupcard.html) expect to receive that **exact JSON string**, parse it, and then call `updateMarquee(msg.html)` or `updateMatchupCard(msg.html)`.

So your server must **relay** the message from the dashboard to all connected overlay clients — it must send the same bytes it received, not raw text.

## Option 1: Use the relay script (recommended)

On the OBS/stream machine:

```bash
node scripts/overlay-ws-relay.js
```

Uses port 4455 (or set `OVERLAY_WS_PORT`). Then use `ws://<that-machine-ip>:4455` in the connection card.

## Option 2: Change your existing server to relay

If you already have a server like this:

```js
export function updateMarquee(text) {
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(text);
  }
}
```

then the overlay will not update, because the dashboard never calls your function — it **connects as a client** and sends a message. You need to **handle incoming messages** and broadcast them:

```js
wss.on("connection", (ws) => {
  console.log("OBS marquee connected");
  ws.on("message", (data) => {
    // Relay: send the same message (JSON) to all clients so overlay pages receive it
    for (const client of wss.clients) {
      if (client.readyState === 1) client.send(data);
    }
  });
});
```

If you still want to call `updateMarquee(text)` from elsewhere (e.g. a test), send JSON so the overlay can parse it:

```js
export function updateMarquee(html) {
  const payload = JSON.stringify({ type: "marquee", html });
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(payload);
  }
}
```

Port must match the connection card URL (e.g. 4455 for `ws://192.168.0.63:4455`).
