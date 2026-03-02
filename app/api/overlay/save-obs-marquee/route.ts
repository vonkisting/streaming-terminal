import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { buildMarqueeOnlyHtml } from "../route";
import type { MarqueeData } from "../route";

const MARQUEE_TEMPLATE_REPLACE = "<!-- Content updated via updateMarquee(html) over WebSocket -->";
const OBS_OVERLAYS_DIR = "C:\\OBS Overlays";
const OBS_MARQUEE_FILE = path.join(OBS_OVERLAYS_DIR, "Marquee.Html");

/**
 * POST /api/overlay/save-obs-marquee
 * Builds marquee HTML from body.marquee, loads marquee-template.html, replaces the placeholder with the built HTML, and saves to C:\OBS Overlays\Marquee.Html.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const marquee = body.marquee ?? body;
    const data = marquee as MarqueeData;

    const { marqueeInnerHtml } = buildMarqueeOnlyHtml(data, undefined);

    const templatePath = path.join(process.cwd(), "public", "overlay-templates", "marquee-template.html");
    let templateHtml = await readFile(templatePath, "utf-8");

    if (!templateHtml.includes(MARQUEE_TEMPLATE_REPLACE)) {
      return NextResponse.json(
        { ok: false, error: "Marquee template does not contain the expected placeholder comment." },
        { status: 400 }
      );
    }

    const updatedHtml = templateHtml.replace(MARQUEE_TEMPLATE_REPLACE, marqueeInnerHtml);

    await mkdir(OBS_OVERLAYS_DIR, { recursive: true });
    await writeFile(OBS_MARQUEE_FILE, updatedHtml, "utf-8");

    return NextResponse.json({ ok: true, path: OBS_MARQUEE_FILE });
  } catch (err) {
    console.error("Save OBS marquee error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
