/**
 * In-memory store for the latest overlay HTML. GET /api/overlay/marquee and
 * /api/overlay/matchup-card serve from here so the app can host overlays
 * without GitHub (faster, no upload delay).
 */

let marqueeHtml: string | null = null;
let matchupCardHtml: string | null = null;

export function getMarqueeHtml(): string | null {
  return marqueeHtml;
}

export function setMarqueeHtml(html: string): void {
  marqueeHtml = html;
}

export function getMatchupCardHtml(): string | null {
  return matchupCardHtml;
}

export function setMatchupCardHtml(html: string): void {
  matchupCardHtml = html;
}
