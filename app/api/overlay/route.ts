import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile } from "fs/promises";
import path from "path";
import { Client as FtpClient } from "basic-ftp";
import { setMarqueeHtml, setMatchupCardHtml } from "@/lib/overlay-store";

interface MarqueeData {
  eventName: string;
  standings: Record<number, number>;
  playerNames: string[];
  marqueeEnabled: boolean;
  marqueeSpeed: number;
  currentMatchupPlayer1: number;
  currentMatchupPlayer2: number;
  showMatchupScore: boolean;
  showMatchupRace: boolean;
  matchupPlayer1Score: number;
  matchupPlayer2Score: number;
  matchupPlayer1Race: string;
  matchupPlayer2Race: string;
  matchupRound: string;
  matchupWhoseTurn: 1 | 2;
  matchupSuit: 1 | 2;
  suitsImagesSwapped?: boolean;
  eventNameFontSize: number;
  subTextFontSize: number;
  playerNameFontSize: number;
  marqueeFontSize: number;
}

function positionLabel(pos: number): string {
  if (pos === 1) return "Champion";
  if (pos === 2) return "Runner-Up";
  const n = pos % 10;
  const suffix = n === 1 && pos !== 11 ? "st" : n === 2 && pos !== 12 ? "nd" : n === 3 && pos !== 13 ? "rd" : "th";
  return `${pos}${suffix}`;
}

function buildOverlayHtml(m: MarqueeData): string {
  const eventLabel = (m.eventName || "").trim() || "\u00A0";
  const eventNameSize = m.eventNameFontSize ?? 12;
  const subTextSize = m.subTextFontSize ?? 12;
  const playerNameSize = m.playerNameFontSize ?? 18;
  const topSectionHeight = Math.max(28, eventNameSize + 16);
  const bottomSectionHeight = Math.max(28, subTextSize + 16);
  const middleSectionMinHeight = Math.max(36, playerNameSize + 20);
  const player1Name =
    m.currentMatchupPlayer1 >= 0
      ? (m.playerNames[m.currentMatchupPlayer1] || `Player ${m.currentMatchupPlayer1 + 1}`)
      : "—";
  const player2Name =
    m.currentMatchupPlayer2 >= 0
      ? (m.playerNames[m.currentMatchupPlayer2] || `Player ${m.currentMatchupPlayer2 + 1}`)
      : "—";
  const whoseTurn = m.matchupWhoseTurn ?? 1;
  const suitsSwapped = m.suitsImagesSwapped ?? false;
  const firstBallSrc = suitsSwapped ? "/pool-ball-15.png" : "/pool-ball-1.png";
  const secondBallSrc = suitsSwapped ? "/pool-ball-1.png" : "/pool-ball-15.png";
  const roundLabel = (m.matchupRound || "").trim() || "\u00A0";

  const ordered = Object.entries(m.standings || {})
    .filter(([, idx]) => idx !== undefined)
    .sort(([a], [b]) => Number(b) - Number(a))
    .map(([pos, playerIndex]) => {
      const name = m.playerNames[Number(playerIndex)] || `Player ${Number(playerIndex) + 1}`;
      return `${positionLabel(Number(pos))} - ${name}`;
    });
  const marqueeFontSize = m.marqueeFontSize ?? 18;
  const verticalPadding = Math.max(8, Math.round(marqueeFontSize * 0.4));
  const speed = Math.max(1, Math.min(100, m.marqueeSpeed ?? 50));
  const duration = Math.max(3, 65 - speed * 0.6);

  const marqueeHtml =
    m.marqueeEnabled && ordered.length > 0
      ? `
    <div style="width:100%;overflow:hidden;border-bottom:1px solid rgba(51,65,85,0.5);background:linear-gradient(to bottom,#1e3a8a,#1e40af,#1e3a8a);">
      <div class="marquee-inner" style="display:inline-flex;align-items:center;white-space:nowrap;padding:${verticalPadding}px 16px;animation:marquee ${duration}s linear infinite;">
        ${m.eventName ? `<span style="font-size:${marqueeFontSize}px;color:#e2e8f0;font-weight:500;flex-shrink:0;">${escapeHtml(m.eventName)} - </span><span style="display:inline-block;width:100px;"></span>` : ""}
        ${ordered.map((item) => `<span style="font-size:${marqueeFontSize}px;color:#e2e8f0;font-weight:500;flex-shrink:0;">${escapeHtml(item)}</span><span style="display:inline-block;width:75px;"></span>`).join("")}
        <span style="display:inline-block;width:300px;"></span>
        ${m.eventName ? `<span style="font-size:${marqueeFontSize}px;color:#e2e8f0;font-weight:500;flex-shrink:0;">${escapeHtml(m.eventName)} - </span><span style="display:inline-block;width:100px;"></span>` : ""}
        ${ordered.map((item) => `<span style="font-size:${marqueeFontSize}px;color:#e2e8f0;font-weight:500;flex-shrink:0;">${escapeHtml(item)}</span><span style="display:inline-block;width:75px;"></span>`).join("")}
        <span style="display:inline-block;width:300px;"></span>
      </div>
    </div>`
      : "";

  const matchupCardHtml =
    eventLabel && eventLabel !== "\u00A0"
      ? `
    <div style="width:100%;max-width:672px;margin:0 auto;display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 16px;flex-shrink:0;">
      <div style="width:92%;max-width:420px;min-height:${topSectionHeight}px;display:flex;align-items:center;justify-content:center;background:linear-gradient(to right,rgba(0,0,0,0.5),#b45309,rgba(0,0,0,0.5));clip-path:polygon(8% 0,92% 0,100% 100%,0 100%);color:#fff;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;font-size:${eventNameSize}px;">${escapeHtml(eventLabel)}</div>
      <div style="position:relative;width:100%;">
        ${whoseTurn === 1 ? `<div style="position:absolute;right:100%;top:50%;transform:translateY(-50%);margin-right:8px;"><svg viewBox="0 0 24 24" style="width:28px;height:28px;"><circle cx="12" cy="12" r="11" fill="#f8fafc" stroke="#cbd5e1" stroke-width="0.5"/></svg></div>` : ""}
        ${whoseTurn === 2 ? `<div style="position:absolute;left:100%;top:50%;transform:translateY(-50%);margin-left:8px;"><svg viewBox="0 0 24 24" style="width:28px;height:28px;"><circle cx="12" cy="12" r="11" fill="#f8fafc" stroke="#cbd5e1" stroke-width="0.5"/></svg></div>` : ""}
        <div style="display:flex;align-items:stretch;justify-content:space-between;gap:0;min-height:${middleSectionMinHeight}px;width:100%;border:1px solid rgba(148,163,184,0.7);border-radius:9999px;padding:8px 12px;background:linear-gradient(to bottom,#134e4a,#155e5a,#1e293b);">
          <div style="display:flex;align-items:stretch;gap:8px;flex:1;min-width:0;justify-content:flex-start;border-radius:9999px 0 0 9999px;background:linear-gradient(to bottom,#450a0a,#7f1d1d,#000);padding:8px 12px;margin:-8px -12px -8px -12px;">
            ${m.showMatchupRace && m.showMatchupScore ? `<span style="width:48px;height:100%;display:flex;align-items:center;justify-content:center;background:#fff;border:2px solid rgba(148,163,184,0.7);border-radius:9999px 0 0 9999px;color:#000;font-size:24px;font-weight:700;">${escapeHtml(m.matchupPlayer1Race)}</span>` : ""}
            ${m.showMatchupScore ? `<span style="font-size:20px;font-weight:700;color:#fff;">${m.matchupPlayer1Score}</span><span style="width:1px;background:rgba(255,255,255,0.5);"></span>` : ""}
            <div style="flex:1;min-width:0;display:flex;align-items:center;justify-content:center;position:relative;">
              <img src="${firstBallSrc}" alt="" style="position:absolute;left:0;bottom:100%;margin-bottom:12px;width:48px;height:48px;object-fit:contain;${suitsSwapped ? "transform:scale(1.15)" : "transform:scale(1.2)"};" onerror="this.style.display='none'">
              <span style="font-weight:600;text-transform:uppercase;color:rgba(255,255,255,0.95);text-align:center;font-size:${playerNameSize}px;">${escapeHtml(player1Name)}</span>
            </div>
          </div>
          <span style="font-size:24px;font-weight:700;color:#000;background:#fff;border:2px solid rgba(148,163,184,0.7);padding:0 8px;display:flex;align-items:center;justify-content:center;">VS</span>
          <div style="display:flex;align-items:stretch;gap:8px;flex:1;min-width:0;justify-content:flex-end;border-radius:0 9999px 9999px 0;background:linear-gradient(to bottom,#1e3a8a,#1e40af,#000);padding:8px 12px;margin:-8px -12px -8px -12px;">
            <div style="flex:1;min-width:0;display:flex;align-items:center;justify-content:center;position:relative;">
              <img src="${secondBallSrc}" alt="" style="position:absolute;right:0;bottom:100%;margin-bottom:12px;width:48px;height:48px;object-fit:contain;${suitsSwapped ? "transform:scale(1.2)" : "transform:scale(1.15)"};" onerror="this.style.display='none'">
              <span style="font-weight:600;text-transform:uppercase;color:rgba(255,255,255,0.95);text-align:center;font-size:${playerNameSize}px;">${escapeHtml(player2Name)}</span>
            </div>
            ${m.showMatchupScore ? `<span style="width:1px;background:rgba(255,255,255,0.5);"></span><span style="font-size:20px;font-weight:700;color:#fff;">${m.matchupPlayer2Score}</span>` : ""}
            ${m.showMatchupRace && m.showMatchupScore ? `<span style="width:48px;height:100%;display:flex;align-items:center;justify-content:center;background:#fff;border:2px solid rgba(148,163,184,0.7);border-radius:0 9999px 9999px 0;color:#000;font-size:24px;font-weight:700;">${escapeHtml(m.matchupPlayer2Race)}</span>` : ""}
          </div>
        </div>
      </div>
      <div style="width:92%;max-width:420px;min-height:${bottomSectionHeight}px;display:flex;align-items:center;justify-content:center;background:linear-gradient(to right,rgba(0,0,0,0.5),#b45309,rgba(0,0,0,0.5));clip-path:polygon(0 0,100% 0,92% 100%,8% 100%);color:#fff;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;font-size:${subTextSize}px;">${escapeHtml(roundLabel)}</div>
    </div>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1920, height=1080">
  <title>Stream Overlay</title>
  <style>
    * { box-sizing: border-box; }
    html, body { height: 100%; margin: 0; padding: 0; background: transparent !important; }
    body { display: flex; flex-direction: column; font-family: system-ui, sans-serif; }
    .marquee-inner { width: max-content; }
    @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
  </style>
</head>
<body>
  <div style="flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;">
    ${marqueeHtml}
    <div style="flex:1;min-height:0;"></div>
  </div>
  <div style="flex-shrink:0;">${matchupCardHtml}</div>
</body>
</html>`;
}

/** Optional embedded images as data URIs so the HTML works without external PNGs (e.g. on GitHub Pages). */
interface MatchupCardImageData {
  ball1DataUri: string;
  ball15DataUri: string;
}

/** Builds a full HTML document containing only the matchup card. Used for matchupcard.html on GitHub. */
function buildMatchupCardOnlyHtml(m: MarqueeData, imageData?: MatchupCardImageData, relativePaths?: boolean): string {
  const eventLabel = (m.eventName || "").trim() || "\u00A0";
  if (!eventLabel || eventLabel === "\u00A0") {
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=1920, height=1080"><meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"><meta http-equiv="Pragma" content="no-cache"><meta http-equiv="Expires" content="0"><title>Matchup Card</title><style>*{box-sizing:border-box}html,body{margin:0;padding:0;width:1920px;height:1080px;background:rgba(0,0,0,0.01);display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif}</style></head>
<body><div style="color:#94a3b8;font-size:18px;">No event selected</div></body>
</html>`;
  }
  const eventNameSize = m.eventNameFontSize ?? 12;
  const subTextSize = m.subTextFontSize ?? 12;
  const playerNameSize = m.playerNameFontSize ?? 18;
  const topSectionHeight = Math.max(28, eventNameSize + 16);
  const bottomSectionHeight = Math.max(28, subTextSize + 16);
  const middleSectionMinHeight = Math.max(36, playerNameSize + 20);
  const player1Name =
    m.currentMatchupPlayer1 >= 0
      ? (m.playerNames[m.currentMatchupPlayer1] || `Player ${m.currentMatchupPlayer1 + 1}`)
      : "—";
  const player2Name =
    m.currentMatchupPlayer2 >= 0
      ? (m.playerNames[m.currentMatchupPlayer2] || `Player ${m.currentMatchupPlayer2 + 1}`)
      : "—";
  const whoseTurn = m.matchupWhoseTurn ?? 1;
  const suitsSwapped = m.suitsImagesSwapped ?? false;
  const ball1 = relativePaths ? "pool-ball-1.png" : "/pool-ball-1.png";
  const ball15 = relativePaths ? "pool-ball-15.png" : "/pool-ball-15.png";
  const firstBallSrc = imageData
    ? (suitsSwapped ? imageData.ball15DataUri : imageData.ball1DataUri)
    : (suitsSwapped ? ball15 : ball1);
  const secondBallSrc = imageData
    ? (suitsSwapped ? imageData.ball1DataUri : imageData.ball15DataUri)
    : (suitsSwapped ? ball1 : ball15);
  const roundLabel = (m.matchupRound || "").trim() || "\u00A0";
  const cardMinHeight = topSectionHeight + middleSectionMinHeight + bottomSectionHeight + 2 + 2 + 8 + 8;
  const matchupCardHtml = `
    <div id="matchup-card-root"><div class="matchup-card" style="width:672px;min-width:672px;min-height:${cardMinHeight}px;max-width:100%;margin:0 auto;display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 16px;flex-shrink:0;box-sizing:border-box;">
      <div style="width:92%;max-width:420px;min-width:420px;min-height:${topSectionHeight}px;display:flex;align-items:center;justify-content:center;background:linear-gradient(to right,rgba(0,0,0,0.5),#b45309,rgba(0,0,0,0.5));clip-path:polygon(8% 0,92% 0,100% 100%,0 100%);color:#fff;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;font-size:${eventNameSize}px;">${escapeHtml(eventLabel)}</div>
      <div style="position:relative;width:100%;min-width:672px;">
        ${whoseTurn === 1 ? `<div style="position:absolute;right:100%;top:50%;transform:translateY(-50%);margin-right:8px;min-width:28px;min-height:28px;"><svg viewBox="0 0 24 24" style="width:28px;height:28px;min-width:28px;min-height:28px;"><circle cx="12" cy="12" r="11" fill="#f8fafc" stroke="#cbd5e1" stroke-width="0.5"/></svg></div>` : ""}
        ${whoseTurn === 2 ? `<div style="position:absolute;left:100%;top:50%;transform:translateY(-50%);margin-left:8px;min-width:28px;min-height:28px;"><svg viewBox="0 0 24 24" style="width:28px;height:28px;min-width:28px;min-height:28px;"><circle cx="12" cy="12" r="11" fill="#f8fafc" stroke="#cbd5e1" stroke-width="0.5"/></svg></div>` : ""}
        <div style="display:flex;align-items:stretch;justify-content:space-between;gap:0;min-height:${middleSectionMinHeight}px;min-width:672px;width:100%;border:1px solid rgba(148,163,184,0.7);border-radius:9999px;padding:8px 12px;background:linear-gradient(to bottom,#134e4a,#155e5a,#1e293b);">
          <div style="display:flex;align-items:stretch;gap:8px;flex:1;min-width:220px;justify-content:flex-start;border-radius:9999px 0 0 9999px;background:linear-gradient(to bottom,#450a0a,#7f1d1d,#000);padding:8px 12px;margin:-8px -12px -8px -12px;">
            ${m.showMatchupRace && m.showMatchupScore ? `<span style="width:48px;min-width:48px;min-height:${middleSectionMinHeight}px;height:100%;display:flex;align-items:center;justify-content:center;background:#fff;border:2px solid rgba(148,163,184,0.7);border-radius:9999px 0 0 9999px;color:#000;font-size:24px;font-weight:700;">${escapeHtml(m.matchupPlayer1Race)}</span>` : ""}
            ${m.showMatchupScore ? `<span style="font-size:20px;font-weight:700;color:#fff;min-width:28px;min-height:20px;">${m.matchupPlayer1Score}</span><span style="width:1px;min-width:1px;min-height:20px;background:rgba(255,255,255,0.5);"></span>` : ""}
            <div style="flex:1;min-width:80px;display:flex;align-items:center;justify-content:center;position:relative;">
              <img src="${firstBallSrc}" alt="" style="position:absolute;left:0;bottom:100%;margin-bottom:12px;width:48px;height:48px;min-width:48px;min-height:48px;object-fit:contain;${suitsSwapped ? "transform:scale(1.15)" : "transform:scale(1.2)"};" onerror="this.style.display='none'">
              <span style="font-weight:600;text-transform:uppercase;color:rgba(255,255,255,0.95);text-align:center;font-size:${playerNameSize}px;min-height:${playerNameSize + 4}px;">${escapeHtml(player1Name)}</span>
            </div>
          </div>
          <span style="font-size:24px;font-weight:700;color:#000;background:#fff;border:2px solid rgba(148,163,184,0.7);padding:0 8px;min-width:40px;min-height:${middleSectionMinHeight}px;display:flex;align-items:center;justify-content:center;">VS</span>
          <div style="display:flex;align-items:stretch;gap:8px;flex:1;min-width:220px;justify-content:flex-end;border-radius:0 9999px 9999px 0;background:linear-gradient(to bottom,#1e3a8a,#1e40af,#000);padding:8px 12px;margin:-8px -12px -8px -12px;">
            <div style="flex:1;min-width:80px;display:flex;align-items:center;justify-content:center;position:relative;">
              <img src="${secondBallSrc}" alt="" style="position:absolute;right:0;bottom:100%;margin-bottom:12px;width:48px;height:48px;min-width:48px;min-height:48px;object-fit:contain;${suitsSwapped ? "transform:scale(1.2)" : "transform:scale(1.15)"};" onerror="this.style.display='none'">
              <span style="font-weight:600;text-transform:uppercase;color:rgba(255,255,255,0.95);text-align:center;font-size:${playerNameSize}px;min-height:${playerNameSize + 4}px;">${escapeHtml(player2Name)}</span>
            </div>
            ${m.showMatchupScore ? `<span style="width:1px;min-width:1px;min-height:20px;background:rgba(255,255,255,0.5);"></span><span style="font-size:20px;font-weight:700;color:#fff;min-width:28px;min-height:20px;">${m.matchupPlayer2Score}</span>` : ""}
            ${m.showMatchupRace && m.showMatchupScore ? `<span style="width:48px;min-width:48px;min-height:${middleSectionMinHeight}px;height:100%;display:flex;align-items:center;justify-content:center;background:#fff;border:2px solid rgba(148,163,184,0.7);border-radius:0 9999px 9999px 0;color:#000;font-size:24px;font-weight:700;">${escapeHtml(m.matchupPlayer2Race)}</span>` : ""}
          </div>
        </div>
      </div>
      <div style="width:92%;max-width:420px;min-width:420px;min-height:${bottomSectionHeight}px;display:flex;align-items:center;justify-content:center;background:linear-gradient(to right,rgba(0,0,0,0.5),#b45309,rgba(0,0,0,0.5));clip-path:polygon(0 0,100% 0,92% 100%,8% 100%);color:#fff;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;font-size:${subTextSize}px;">${escapeHtml(roundLabel)}</div>
    </div></div>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1920, height=1080">
  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
  <meta http-equiv="Pragma" content="no-cache">
  <meta http-equiv="Expires" content="0">
  <title>Matchup Card</title>
  <style>
    *{box-sizing:border-box}
    html,body{margin:0;padding:0;width:1920px;height:1080px;background:rgba(0,0,0,0.01);display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif}
    .matchup-card{flex-shrink:0}
  </style>
</head>
<body>
${matchupCardHtml}
</body>
</html>`;
}

/** Builds a full HTML document containing only the marquee (no matchup card). Used for marquee.html and GitHub upload. */
function buildMarqueeOnlyHtml(m: MarqueeData): string {
  const ordered = Object.entries(m.standings || {})
    .filter(([, idx]) => idx !== undefined)
    .sort(([a], [b]) => Number(b) - Number(a))
    .map(([pos, playerIndex]) => {
      const name = m.playerNames[Number(playerIndex)] || `Player ${Number(playerIndex) + 1}`;
      return `${positionLabel(Number(pos))} - ${name}`;
    });
  const marqueeFontSize = m.marqueeFontSize ?? 18;
  const verticalPadding = Math.max(8, Math.round(marqueeFontSize * 0.4));
  const speed = Math.max(1, Math.min(100, m.marqueeSpeed ?? 50));
  const duration = Math.max(3, 65 - speed * 0.6);
  const marqueeHtml =
    m.marqueeEnabled && ordered.length > 0
      ? `
    <div style="width:100%;overflow:hidden;border-bottom:1px solid rgba(51,65,85,0.5);background:linear-gradient(to bottom,#1e3a8a,#1e40af,#1e3a8a);">
      <div class="marquee-inner" style="display:inline-flex;align-items:center;white-space:nowrap;padding:${verticalPadding}px 16px;animation:marquee ${duration}s linear infinite;">
        ${m.eventName ? `<span style="font-size:${marqueeFontSize}px;color:#e2e8f0;font-weight:500;flex-shrink:0;">${escapeHtml(m.eventName)} - </span><span style="display:inline-block;width:100px;"></span>` : ""}
        ${ordered.map((item) => `<span style="font-size:${marqueeFontSize}px;color:#e2e8f0;font-weight:500;flex-shrink:0;">${escapeHtml(item)}</span><span style="display:inline-block;width:75px;"></span>`).join("")}
        <span style="display:inline-block;width:300px;"></span>
        ${m.eventName ? `<span style="font-size:${marqueeFontSize}px;color:#e2e8f0;font-weight:500;flex-shrink:0;">${escapeHtml(m.eventName)} - </span><span style="display:inline-block;width:100px;"></span>` : ""}
        ${ordered.map((item) => `<span style="font-size:${marqueeFontSize}px;color:#e2e8f0;font-weight:500;flex-shrink:0;">${escapeHtml(item)}</span><span style="display:inline-block;width:75px;"></span>`).join("")}
        <span style="display:inline-block;width:300px;"></span>
      </div>
    </div>`
      : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1920, height=1080">
  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
  <meta http-equiv="Pragma" content="no-cache">
  <meta http-equiv="Expires" content="0">
  <title>Marquee Overlay</title>
  <style>
    * { box-sizing: border-box; }
    html, body { height: 100%; margin: 0; padding: 0; background: transparent !important; }
    body { display: flex; flex-direction: column; font-family: system-ui, sans-serif; }
    .marquee-inner { width: max-content; }
    @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
  </style>
</head>
<body>
  <div style="width:100%;flex:1;min-height:0;overflow:hidden;display:flex;flex-direction:column;">
    ${marqueeHtml}
  </div>
  <script>
async function checkForUpdate() {
    try {
        var url = window.location.href + (window.location.href.indexOf("?") >= 0 ? "&" : "?") + "_=" + Date.now();
        const response = await fetch(url, { method: "HEAD", cache: "no-store" });
        const newTag = response.headers.get("ETag");
        if (!window.lastETag) {
            window.lastETag = newTag;
        } else if (newTag && newTag !== window.lastETag) {
            location.reload();
        }
    } catch (e) {
        console.error("Update check failed", e);
    }
}
checkForUpdate();
setInterval(checkForUpdate, 500);
</script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const marquee = body.marquee ?? body;
    const data = marquee as MarqueeData;
    // marquee.html contains only the marquee (no matchup card).
    const marqueeOnlyHtml = buildMarqueeOnlyHtml(data);
    const matchupCardOnlyHtml = buildMatchupCardOnlyHtml(data);
    const publicDir = path.join(process.cwd(), "public");
    const filePath = path.join(publicDir, "marquee.html");
    const matchupCardPath = path.join(publicDir, "matchupcard.html");
    await Promise.all([
      writeFile(filePath, marqueeOnlyHtml, "utf-8"),
      writeFile(matchupCardPath, matchupCardOnlyHtml, "utf-8"),
    ]);

    const ftpHost = process.env.FTP_HOST;
    const ftpUser = process.env.FTP_USER;
    const ftpPassword = process.env.FTP_PASSWORD;
    const ftpRemoteDir = process.env.FTP_REMOTE_DIR ?? ".";

    // When FTP is configured, build the server URL; GitHub upload can override with GitHub Pages URL.
    const baseUrl = ftpHost ? (process.env.MARQUEE_PUBLIC_URL ?? `http://${ftpHost}`) : "";
    const urlPath = process.env.MARQUEE_URL_PATH ?? "marquee.html";
    let marqueeUrl: string | undefined =
      baseUrl && urlPath
        ? `${baseUrl.replace(/\/$/, "")}/${urlPath.replace(/^\//, "")}`
        : undefined;

    if (ftpHost && ftpUser && ftpPassword) {
      const client = new FtpClient(60_000);
      try {
        await client.access({
          host: ftpHost,
          user: ftpUser,
          password: ftpPassword,
          secure: false,
        });
        const remotePath = ftpRemoteDir === "." ? "marquee.html" : path.join(ftpRemoteDir, "marquee.html").replace(/\\/g, "/");
        await client.uploadFrom(filePath, remotePath);
      } catch (ftpErr) {
        console.error("FTP upload error:", ftpErr);
        return NextResponse.json(
          { ok: true, path: "/marquee.html", savedPath: filePath, marqueeUrl, ftpError: String(ftpErr) },
          { status: 200 }
        );
      } finally {
        client.close();
      }
    }

    const responsePayload: Record<string, unknown> = {
      ok: true,
      path: "/marquee.html",
      savedPath: filePath,
      ...(marqueeUrl && { marqueeUrl }),
    };

    // Build matchup card HTML with inline ball images so client can inject via data: URL (no external load).
    let matchupCardImageData: MatchupCardImageData | undefined;
    try {
      const [ball1Buf, ball15Buf] = await Promise.all([
        readFile(path.join(publicDir, "pool-ball-1.png")).catch(() => null),
        readFile(path.join(publicDir, "pool-ball-15.png")).catch(() => null),
      ]);
      if (ball1Buf && ball15Buf) {
        matchupCardImageData = {
          ball1DataUri: `data:image/png;base64,${ball1Buf.toString("base64")}`,
          ball15DataUri: `data:image/png;base64,${ball15Buf.toString("base64")}`,
        };
      }
    } catch (_) {}
    const matchupCardOnlyHtmlWithImages = buildMatchupCardOnlyHtml(data, matchupCardImageData, true);
    responsePayload.matchupCardHtml = matchupCardOnlyHtmlWithImages;

    // Store HTML so GET /api/overlay/marquee and /api/overlay/matchup-card can serve it (no GitHub needed).
    setMarqueeHtml(marqueeOnlyHtml);
    setMatchupCardHtml(matchupCardOnlyHtmlWithImages);

    let overlayBase = (process.env.OVERLAY_PUBLIC_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
    if (!overlayBase) {
      try {
        const u = new URL(request.url);
        if (u.hostname !== "localhost" && u.hostname !== "127.0.0.1") overlayBase = u.origin;
      } catch (_) {}
    }
    if (overlayBase) {
      responsePayload.marqueeUrl = `${overlayBase}/api/overlay/marquee`;
      responsePayload.matchupCardUrl = `${overlayBase}/api/overlay/matchup-card`;
    }

    // Upload to GitHub only when app-hosted URLs are not used (fallback; can cause 404 delay).
    const githubToken = process.env.GITHUB_TOKEN;
    const githubRepo = process.env.GITHUB_REPO;
    const githubBranch = process.env.GITHUB_BRANCH ?? "main";
    if (githubToken && githubRepo && /^[^/]+\/[^/]+$/.test(githubRepo)) {
      const [owner, repo] = githubRepo.split("/");
      const githubPagesUrl = `https://${owner}.github.io/${repo}/marquee.html`;
      try {
        const getRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/marquee.html?ref=${encodeURIComponent(githubBranch)}`,
          { headers: { Authorization: `Bearer ${githubToken}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" } }
        );
        let sha: string | undefined;
        if (getRes.ok) {
          const data = await getRes.json();
          sha = data.sha;
        }
        const putRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/marquee.html`,
          {
            method: "PUT",
            headers: { Authorization: `Bearer ${githubToken}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json" },
            body: JSON.stringify({
              message: "Update marquee overlay",
              content: Buffer.from(marqueeOnlyHtml, "utf-8").toString("base64"),
              branch: githubBranch,
              ...(sha && { sha }),
            }),
          }
        );
        if (putRes.ok) {
          marqueeUrl = githubPagesUrl;
          if (!responsePayload.marqueeUrl) responsePayload.marqueeUrl = githubPagesUrl;
          responsePayload.githubUploadedAt = new Date().toISOString();
        } else {
          const errBody = await putRes.text();
          console.error("GitHub upload error (marquee.html):", putRes.status, errBody);
        }

        // Upload matchup card HTML (already built with inline ball images) to GitHub.
        const matchupCardOnlyHtmlForGitHub = matchupCardOnlyHtmlWithImages;
        // Use a unique filename per update so OBS always loads a new URL (no cache).
        const matchupCardFilename = `matchupcard-${Date.now()}.html`;
        const matchupCardPagesUrl = `https://${owner}.github.io/${repo}/${matchupCardFilename}`;
        const putMatchupRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${matchupCardFilename}`,
          {
            method: "PUT",
            headers: { Authorization: `Bearer ${githubToken}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json" },
            body: JSON.stringify({
              message: "Update matchup card overlay",
              content: Buffer.from(matchupCardOnlyHtmlForGitHub, "utf-8").toString("base64"),
              branch: githubBranch,
            }),
          }
        );
        if (putMatchupRes.ok) {
          if (!responsePayload.matchupCardUrl) responsePayload.matchupCardUrl = matchupCardPagesUrl;
          // Delete old matchupcard-*.html files (keep only the one we just uploaded).
          try {
            const listRes = await fetch(
              `https://api.github.com/repos/${owner}/${repo}/contents/?ref=${encodeURIComponent(githubBranch)}`,
              { headers: { Authorization: `Bearer ${githubToken}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" } }
            );
            if (listRes.ok) {
              const list = (await listRes.json()) as { type?: string; name?: string; sha?: string }[];
              const matchupCardPattern = /^matchupcard-\d+\.html$/;
              for (const item of list ?? []) {
                if (item.type !== "file" || !item.name?.match(matchupCardPattern) || item.name === matchupCardFilename || !item.sha) continue;
                const delRes = await fetch(
                  `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(item.name)}`,
                  {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${githubToken}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json" },
                    body: JSON.stringify({ message: "Remove old matchup card overlay", sha: item.sha, branch: githubBranch }),
                  }
                );
                if (!delRes.ok && delRes.status !== 404) {
                  console.error("GitHub delete old matchup card:", item.name, delRes.status, await delRes.text());
                }
              }
            }
          } catch (cleanupErr) {
            console.error("GitHub cleanup old matchup cards:", cleanupErr);
          }
        } else {
          const errBody = await putMatchupRes.text();
          console.error("GitHub upload error (matchupcard.html):", putMatchupRes.status, errBody);
        }
      } catch (githubErr) {
        console.error("GitHub upload error:", githubErr);
      }
    }

    return NextResponse.json(responsePayload);
  } catch (err) {
    console.error("Overlay write error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
