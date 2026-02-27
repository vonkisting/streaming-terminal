import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { getMarqueeHtml } from "@/lib/overlay-store";

const NO_CACHE_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET() {
  let html = getMarqueeHtml();
  if (html == null) {
    try {
      html = await readFile(path.join(process.cwd(), "public", "marquee.html"), "utf-8");
    } catch {
      return NextResponse.json({ error: "Marquee not ready" }, { status: 404 });
    }
  }
  return new NextResponse(html, { headers: NO_CACHE_HEADERS });
}
