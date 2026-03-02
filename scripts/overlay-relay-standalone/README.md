# Overlay WebSocket relay (standalone)

Copy this **entire folder** to the OBS machine (USB drive, network share, etc.). Then on the OBS machine:

## 1. Install Node.js (if needed)

Download from https://nodejs.org (LTS). Restart the terminal after installing.

## 2. Install and run

Open a terminal in this folder and run:

```bash
npm install
npm start
```

Default port is **4455**. For port 8080:

- **Windows (CMD):** `set OVERLAY_WS_PORT=8080 && npm start`
- **Windows (PowerShell):** `$env:OVERLAY_WS_PORT="8080"; npm start`

Leave the terminal open. Use `ws://<OBS-machine-ip>:<port>` in the dashboard **Overlay URL** and in your marquee page.
