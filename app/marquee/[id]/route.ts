import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

const MARQUEE_PATH = path.join(process.cwd(), "public", "marquee.html");

/**
 * Serves the current marquee content at a unique path (e.g. /marquee/1739812345678).
 * Each overlay update uses a new [id], so OBS never hits a cached response.
 */
export async function GET() {
  try {
    const html = await readFile(MARQUEE_PATH, "utf-8");
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch {
    return new NextResponse("Marquee not ready", { status: 404 });
  }
}
