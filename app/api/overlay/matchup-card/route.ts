import { NextResponse } from "next/server";
import { getMatchupCardHtml } from "@/lib/matchup-card-store";

const PLACEHOLDER_HTML = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=1920, height=1080"><title>Matchup Card</title></head>
<body style="margin:0;padding:0;background:transparent;display:flex;align-items:center;justify-content:center;min-height:100vh;color:#94a3b8;font-family:system-ui,sans-serif;">
  <p>No matchup data yet. Update the dashboard.</p>
</body>
</html>`;

export async function GET() {
  const html = getMatchupCardHtml();
  return new NextResponse(html ?? PLACEHOLDER_HTML, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
