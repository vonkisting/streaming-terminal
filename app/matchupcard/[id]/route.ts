import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

const MATCHUPCARD_PATH = path.join(process.cwd(), "public", "matchupcard.html");

/**
 * Serves the current matchup card HTML at a unique path (e.g. /matchupcard/1739812345678).
 * Each overlay update uses a new [id], so OBS never hits a cached response.
 */
const NO_CACHE_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

const LOADING_HTML = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=1920, height=1080"></head><body style="margin:0;background:rgba(0,0,0,0.85);color:#e2e8f0;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;"><p style="font-size:18px;">Matchup card loading...</p></body></html>`;

export async function GET() {
  try {
    const html = await readFile(MATCHUPCARD_PATH, "utf-8");
    return new NextResponse(html, { headers: NO_CACHE_HEADERS });
  } catch {
    return new NextResponse(LOADING_HTML, { status: 200, headers: NO_CACHE_HEADERS });
  }
}
