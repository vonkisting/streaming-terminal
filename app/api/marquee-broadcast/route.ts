import { NextRequest, NextResponse } from "next/server";
import { updateMarquee } from "@/lib/marquee-ws-server";

/**
 * POST /api/marquee-broadcast
 * Body: { text: string }
 * Broadcasts the given text to all connected marquee WebSocket clients (e.g. OBS overlay).
 * Called from the dashboard when the marquee is updated.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const text = typeof body?.text === "string" ? body.text : String(body?.text ?? "");
    updateMarquee(text);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Marquee broadcast error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
