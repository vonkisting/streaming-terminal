import { NextRequest, NextResponse } from "next/server";
import { readFile, unlink } from "fs/promises";
import path from "path";

const TEMP_DIR = path.join(process.cwd(), ".temp", "sound-effect");

const CONTENT_TYPES: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".aac": "audio/aac",
  ".m4a": "audio/mp4",
  ".webm": "audio/webm",
};

function contentType(id: string): string {
  const i = id.lastIndexOf(".");
  const ext = i >= 0 ? id.slice(i).toLowerCase() : "";
  return CONTENT_TYPES[ext] ?? "application/octet-stream";
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id || id.includes("..")) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  try {
    const filePath = path.join(TEMP_DIR, decodeURIComponent(id));
    const buffer = await readFile(filePath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType(id),
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id || id.includes("..")) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  try {
    const filePath = path.join(TEMP_DIR, decodeURIComponent(id));
    await unlink(filePath);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
