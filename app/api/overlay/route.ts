import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { setMarqueeHtml, setMatchupCardHtml } from "@/lib/overlay-store";

export interface MarqueeData {
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
              <img src="${firstBallSrc}" alt="" style="position:absolute;left:0;bottom:100%;margin-bottom:12px;width:48px;height:48px;object-fit:contain;border:1px solid #000;border-radius:50%;${suitsSwapped ? "transform:scale(1.15)" : "transform:scale(1.2)"};" onerror="this.style.display='none'">
              <span style="font-weight:600;text-transform:uppercase;color:rgba(255,255,255,0.95);text-align:center;font-size:${playerNameSize}px;">${escapeHtml(player1Name)}</span>
            </div>
          </div>
          <span style="font-size:24px;font-weight:700;color:#000;background:#fff;border:2px solid rgba(148,163,184,0.7);padding:0 8px;display:flex;align-items:center;justify-content:center;">VS</span>
          <div style="display:flex;align-items:stretch;gap:8px;flex:1;min-width:0;justify-content:flex-end;border-radius:0 9999px 9999px 0;background:linear-gradient(to bottom,#1e3a8a,#1e40af,#000);padding:8px 12px;margin:-8px -12px -8px -12px;">
            <div style="flex:1;min-width:0;display:flex;align-items:center;justify-content:center;position:relative;">
              <img src="${secondBallSrc}" alt="" style="position:absolute;right:0;bottom:100%;margin-bottom:12px;width:48px;height:48px;object-fit:contain;border:1px solid #000;border-radius:50%;${suitsSwapped ? "transform:scale(1.2)" : "transform:scale(1.15)"};" onerror="this.style.display='none'">
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

/** Exact Tailwind-equivalent styles from MatchupCard.tsx preview for matchupcard.html */
const TOP_BOTTOM_PANEL_STYLE =
  "color:#fff;font-family:system-ui,sans-serif;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -2px rgba(0,0,0,0.1);background:linear-gradient(to right,rgba(0,0,0,0.5),#b45309,rgba(0,0,0,0.5));font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.95)";
const MIDDLE_PANEL_STYLE =
  "border:1px solid rgba(148,163,184,0.7);color:#fff;font-family:system-ui,sans-serif;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -2px rgba(0,0,0,0.1);background:linear-gradient(to bottom,rgba(19,78,74,0.95),rgba(17,94,89,0.9),rgba(30,41,59,0.95));background-size:100% 200%";
const CUEBALL_SVG =
  `<svg viewBox="0 0 24 24" style="width:63px;height:63px;filter:drop-shadow(0 4px 6px rgba(0,0,0,0.1));" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="cueball-shine" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fff"/><stop offset="40%" stop-color="#f8fafc"/><stop offset="100%" stop-color="#e2e8f0"/></linearGradient></defs><circle cx="12" cy="12" r="11" fill="url(#cueball-shine)" stroke="#000" stroke-width="2"/></svg>`;

/** Builds a full HTML document and the inner HTML for the matchup container (suit balls + cueball included). */
function buildMatchupCardOnlyHtml(
  m: MarqueeData,
  imageData?: MatchupCardImageData,
  relativePaths?: boolean,
  overlayWsUrl?: string
): { fullHtml: string; matchupInnerHtml: string } {
  const eventLabel = (m.eventName || "").trim() || "\u00A0";
  if (!eventLabel || eventLabel === "\u00A0") {
    const emptyBody = `<div style="color:#94a3b8;font-size:18px;">No event selected</div>`;
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=1920, height=1080"><meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"><meta http-equiv="Pragma" content="no-cache"><meta http-equiv="Expires" content="0"><title>Matchup Card</title><style>*{box-sizing:border-box}html,body{margin:0;padding:0;width:1920px;height:1080px;background:rgba(0,0,0,0.01);display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif}</style></head>
<body>${emptyBody}</body>
</html>`;
    return { fullHtml, matchupInnerHtml: emptyBody };
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

  const topSection = `<div style="width:92%;max-width:420px;display:flex;align-items:center;justify-content:center;min-height:${topSectionHeight}px;clip-path:polygon(8% 0,92% 0,100% 100%,0 100%);${TOP_BOTTOM_PANEL_STYLE};font-size:${eventNameSize}px;">${escapeHtml(eventLabel)}</div>`;

  const cueBallSize = 40;
  const cueBallSvgSmall = CUEBALL_SVG.replace('width:63px;height:63px', `width:${cueBallSize}px;height:${cueBallSize}px`);
  const cueBallBelowP1 = whoseTurn === 1
    ? `<div style="position:absolute;left:0;top:100%;margin-top:16px;display:flex;align-items:center;justify-content:center;width:${cueBallSize}px;height:${cueBallSize}px;">${cueBallSvgSmall}</div>`
    : "";
  const cueBallBelowP2 = whoseTurn === 2
    ? `<div style="position:absolute;right:0;top:100%;margin-top:16px;display:flex;align-items:center;justify-content:center;width:${cueBallSize}px;height:${cueBallSize}px;">${cueBallSvgSmall}</div>`
    : "";

  const raceBadgeP1 = m.showMatchupRace && m.showMatchupScore
    ? `<div style="flex-shrink:0;align-self:stretch;margin-left:-12px;margin-right:0;"><span style="width:48px;height:100%;display:flex;align-items:center;justify-content:center;background:#fff;border:2px solid rgba(148,163,184,0.7);border-radius:9999px 0 0 9999px;color:#000;font-size:24px;font-weight:700;letter-spacing:0.05em;text-align:center;padding:0 2px;overflow:hidden;">${escapeHtml(m.matchupPlayer1Race)}</span></div>`
    : "";
  const scoreP1 = m.showMatchupScore
    ? `<div style="flex-shrink:0;display:flex;align-items:center;justify-content:center;padding:0 2px;"><span style="font-size:20px;font-weight:700;font-variant-numeric:tabular-nums;color:#fff;">${m.matchupPlayer1Score}</span></div><div style="width:1px;align-self:stretch;min-height:20px;background:rgba(255,255,255,0.5);flex-shrink:0;"></div>`
    : "";
  const vsBoxSize = middleSectionMinHeight + 16;
  const charWidthApprox = playerNameSize * 0.65;
  const nameMinWidthPx = Math.ceil(Math.max(player1Name.length * charWidthApprox, player2Name.length * charWidthApprox) + 50);
  const player1Block = `<div style="flex:1 1 0;min-width:${nameMinWidthPx}px;display:flex;align-items:center;justify-content:center;position:relative;"><img src="${firstBallSrc}" alt="" style="position:absolute;left:0;bottom:100%;margin-bottom:20px;width:56px;height:56px;object-fit:contain;border:1px solid #000;border-radius:50%;${suitsSwapped ? "transform:scale(1.15)" : "transform:scale(1.2)"};" onerror="this.style.display='none'">${cueBallBelowP1}<span style="font-weight:600;text-transform:uppercase;color:rgba(255,255,255,0.95);text-align:center;font-size:${playerNameSize}px;white-space:nowrap;padding:0 25px;">${escapeHtml(player1Name)}</span></div>`;

  const vsBlock = `<div style="flex-shrink:0;position:relative;z-index:2;display:flex;align-items:center;justify-content:center;margin-top:-8px;margin-bottom:-8px;width:${vsBoxSize}px;height:${vsBoxSize}px;box-sizing:border-box;"><span style="font-size:24px;font-weight:700;color:#000;letter-spacing:0.05em;background:#fff;border:2px solid rgba(148,163,184,0.7);padding:0 8px;display:flex;align-items:center;justify-content:center;width:100%;height:100%;box-sizing:border-box;">VS</span></div>`;

  const player2Block = `<div style="flex:1 1 0;min-width:${nameMinWidthPx}px;display:flex;align-items:center;justify-content:center;position:relative;"><img src="${secondBallSrc}" alt="" style="position:absolute;right:0;bottom:100%;margin-bottom:20px;width:56px;height:56px;object-fit:contain;border:1px solid #000;border-radius:50%;${suitsSwapped ? "transform:scale(1.2)" : "transform:scale(1.15)"};" onerror="this.style.display='none'">${cueBallBelowP2}<span style="font-weight:600;text-transform:uppercase;color:rgba(255,255,255,0.95);text-align:center;font-size:${playerNameSize}px;white-space:nowrap;padding:0 25px;">${escapeHtml(player2Name)}</span></div>`;
  const scoreP2 = m.showMatchupScore
    ? `<div style="width:1px;align-self:stretch;min-height:20px;background:rgba(255,255,255,0.5);flex-shrink:0;"></div><div style="flex-shrink:0;display:flex;align-items:center;justify-content:center;padding:0 2px;"><span style="font-size:20px;font-weight:700;font-variant-numeric:tabular-nums;color:#fff;">${m.matchupPlayer2Score}</span></div>`
    : "";
  const raceBadgeP2 = m.showMatchupRace && m.showMatchupScore
    ? `<div style="flex-shrink:0;align-self:stretch;margin-right:-12px;margin-left:0;"><span style="width:48px;height:100%;display:flex;align-items:center;justify-content:center;background:#fff;border:2px solid rgba(148,163,184,0.7);border-radius:0 9999px 9999px 0;color:#000;font-size:24px;font-weight:700;letter-spacing:0.05em;text-align:center;padding:0 2px;overflow:hidden;">${escapeHtml(m.matchupPlayer2Race)}</span></div>`
    : "";

  const middlePanel = `<div style="display:flex;align-items:stretch;justify-content:space-between;gap:0;min-height:${middleSectionMinHeight}px;width:fit-content;border-radius:9999px;padding:8px 12px;${MIDDLE_PANEL_STYLE};">
  <div style="display:flex;align-items:stretch;gap:8px;flex:1 1 0;min-width:${nameMinWidthPx}px;justify-content:flex-start;border-radius:9999px 0 0 9999px;background:linear-gradient(to bottom,#450a0a,rgba(127,29,29,0.95),#000);margin:-8px -12px -8px -8px;padding:8px 12px;position:relative;z-index:0;">${raceBadgeP1}${scoreP1}${player1Block}</div>
  ${vsBlock}
  <div style="display:flex;align-items:stretch;gap:8px;flex:1 1 0;min-width:${nameMinWidthPx}px;justify-content:flex-end;border-radius:0 9999px 9999px 0;background:linear-gradient(to bottom,#172554,rgba(30,58,138,0.95),#000);margin:-8px -8px -8px -12px;padding:8px 12px;position:relative;z-index:0;">${player2Block}${scoreP2}${raceBadgeP2}</div>
</div>`;

  const bottomSection = `<div style="width:92%;max-width:420px;display:flex;align-items:center;justify-content:center;min-height:${bottomSectionHeight}px;clip-path:polygon(0 0,100% 0,92% 100%,8% 100%);${TOP_BOTTOM_PANEL_STYLE};font-size:${subTextSize}px;">${escapeHtml(roundLabel)}</div>`;

  const cardInner = `<div style="width:100%;max-width:672px;margin:0 auto;display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 16px;flex-shrink:0;box-sizing:border-box;">
${topSection}
<div style="display:flex;justify-content:center;width:100%;">
${middlePanel}
</div>
${bottomSection}
</div>`;

  // Static pages (e.g. stream.poolhub.us) load once; updates via updateMatchupCard(html) over WebSocket from app server.
  const wsUrl = overlayWsUrl || "ws://localhost:4455";
  const wsScript = `
  <script>
function updateMatchupCard(html) {
  var el = document.getElementById("matchup-container");
  if (el && typeof html === "string") el.innerHTML = html;
}
(function(){
  var WS_URL = ${JSON.stringify(wsUrl)};
  function connect() {
    try {
      var ws = new WebSocket(WS_URL);
      ws.onmessage = function(e) {
        try {
          var msg = JSON.parse(e.data);
          if (msg.type === "matchup" && typeof msg.html === "string") updateMatchupCard(msg.html);
        } catch (err) {}
      };
      ws.onclose = function() { setTimeout(connect, 2000); };
    } catch (err) { setTimeout(connect, 2000); }
  }
  connect();
})();
  <\/script>`;

  const fullHtml = `<!DOCTYPE html>
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
  </style>
</head>
<body>
  <div id="matchup-container">${cardInner}</div>${wsScript}
</body>
</html>`;
  return { fullHtml, matchupInnerHtml: cardInner };
}

/** Plain-text marquee line (event + standings) for pages that update a single text element. */
function buildMarqueeText(m: MarqueeData): string {
  const ordered = Object.entries(m.standings || {})
    .filter(([, idx]) => idx !== undefined)
    .sort(([a], [b]) => Number(b) - Number(a))
    .map(([pos, playerIndex]) => {
      const name = m.playerNames[Number(playerIndex)] || `Player ${Number(playerIndex) + 1}`;
      return `${positionLabel(Number(pos))} - ${name}`;
    });
  const eventPart = (m.eventName || "").trim();
  const standingsPart = ordered.join(" | ");
  return eventPart && standingsPart ? `${eventPart} — ${standingsPart}` : eventPart || standingsPart || "";
}

/** Builds a full HTML document and the inner HTML for the marquee container. Used for marquee.html and GitHub upload. Exported for save-obs-marquee. */
export function buildMarqueeOnlyHtml(m: MarqueeData, overlayWsUrl?: string): { fullHtml: string; marqueeInnerHtml: string } {
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
  const marqueeInnerHtml =
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
  const wsUrl = overlayWsUrl || "ws://localhost:4455";
  const wsScript = `
  <script>
function updateMarquee(html) {
  var el = document.getElementById("marquee-container");
  if (el && typeof html === "string") el.innerHTML = html;
}
(function(){
  var WS_URL = ${JSON.stringify(wsUrl)};
  function connect() {
    try {
      var ws = new WebSocket(WS_URL);
      ws.onmessage = function(e) {
        try {
          var msg = JSON.parse(e.data);
          if (msg.type === "marquee" && typeof msg.html === "string") updateMarquee(msg.html);
        } catch (err) {}
      };
      ws.onclose = function() { setTimeout(connect, 2000); };
    } catch (err) { setTimeout(connect, 2000); }
  }
  connect();
})();
  <\/script>`;
  const fullHtml = `<!DOCTYPE html>
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
  <div style="width:100%;flex:1;min-height:0;overflow:hidden;display:flex;flex-direction:column;" id="marquee-container">
    ${marqueeInnerHtml}
  </div>${wsScript}
</body>
</html>`;
  return { fullHtml, marqueeInnerHtml };
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
    // Use overlay WS URL from connection card (request body) so user can switch OBS machines without changing env. Fallback to env then localhost.
    const overlayWsUrl =
      (typeof body.overlayWsUrl === "string" && body.overlayWsUrl.trim()) ||
      process.env.NEXT_PUBLIC_OVERLAY_WS_URL ||
      "ws://localhost:4455";
    const { fullHtml: marqueeFullHtml, marqueeInnerHtml } = buildMarqueeOnlyHtml(data, overlayWsUrl);
    const publicDir = path.join(process.cwd(), "public");

    // OBS loads static pages from https://stream.poolhub.us/marquee.html and matchupcard.html (hardcoded in browser source).
    // We do not read or write those files; we only send inner HTML via WebSocket so the pages call updateMarquee(html) / updateMatchupCard(html).

    // Build matchup card with inline ball images so it works when served from FTP (no external image files).
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
    const { fullHtml: matchupCardFullHtml, matchupInnerHtml } = buildMatchupCardOnlyHtml(
      data,
      matchupCardImageData,
      true,
      overlayWsUrl
    );

    const staticBase = (process.env.NEXT_PUBLIC_STREAM_OVERLAY_BASE_URL ?? "http://stream.poolhub.us").replace(/\/$/, "");
    const responsePayload: Record<string, unknown> = {
      ok: true,
      marqueeUrl: `${staticBase}/marquee.html`,
      matchupCardUrl: `${staticBase}/matchupcard.html`,
    };

    responsePayload.matchupCardHtml = matchupCardFullHtml;

    // Store HTML so GET /api/overlay/marquee and /api/overlay/matchup-card can serve it if needed.
    setMarqueeHtml(marqueeFullHtml);
    setMatchupCardHtml(matchupCardFullHtml);

    return NextResponse.json(responsePayload);
  } catch (err) {
    console.error("Overlay write error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
