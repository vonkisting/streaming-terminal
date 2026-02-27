import { readFile, stat } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

const MARQUEE_PATH = path.join(process.cwd(), "public", "marquee.html");

function noCacheHeaders(etag: string) {
  return {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    Pragma: "no-cache",
    Expires: "0",
    ETag: etag,
  };
}

/**
 * Serves the current marquee.html with ETag (from file mtime) and no-cache headers.
 * The marquee page polls HEAD every 2s and reloads when ETag changes, so OBS updates in near real time.
 */
export async function GET() {
  try {
    const [html, st] = await Promise.all([readFile(MARQUEE_PATH, "utf-8"), stat(MARQUEE_PATH)]);
    const etag = `"${st.mtimeMs}"`;
    return new NextResponse(html, { headers: noCacheHeaders(etag) });
  } catch {
    return new NextResponse("Marquee not ready", { status: 404 });
  }
}

export async function HEAD() {
  try {
    const st = await stat(MARQUEE_PATH);
    const etag = `"${st.mtimeMs}"`;
    return new NextResponse(null, {
      status: 200,
      headers: noCacheHeaders(etag),
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
