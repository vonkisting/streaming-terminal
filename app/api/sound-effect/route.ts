import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { Client as FtpClient } from "basic-ftp";

const TEMP_DIR = path.join(process.cwd(), ".temp", "sound-effect");
const SOUND_EFFECTS_REMOTE_DIR = "sound-effects";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const AUDIO_TYPES = new Set(["audio/mpeg", "audio/wav", "audio/wave", "audio/x-wav", "audio/ogg", "audio/aac", "audio/webm", "audio/mp4"]);

function getExt(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : ".mp3";
}

function baseUrl(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

function getFtpPublicBaseUrl(): string {
  const env = process.env.SOUND_EFFECTS_PUBLIC_URL ?? process.env.MARQUEE_PUBLIC_URL;
  if (env) return env.replace(/\/$/, "");
  const ftpHost = process.env.FTP_HOST;
  if (ftpHost) return `http://${ftpHost}`;
  return "";
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Missing or invalid file" }, { status: 400 });
    }
    if (!AUDIO_TYPES.has(file.type) && !file.name.match(/\.(mp3|wav|ogg|aac|m4a|webm)$/i)) {
      return NextResponse.json({ error: "Unsupported audio type" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large" }, { status: 400 });
    }
    await mkdir(TEMP_DIR, { recursive: true });
    const ext = getExt(file.name);
    const id = `${randomUUID()}${ext}`;
    const filePath = path.join(TEMP_DIR, id);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);
    const url = `${baseUrl(req)}/api/sound-effect/${encodeURIComponent(id)}`;
    const localPath = typeof process !== "undefined" && process.env.VERCEL !== "1" ? path.resolve(filePath) : undefined;

    let publicUrl: string | undefined;
    const ftpHost = process.env.FTP_HOST;
    const ftpUser = process.env.FTP_USER;
    const ftpPassword = process.env.FTP_PASSWORD;
    const ftpRemoteDir = process.env.FTP_REMOTE_DIR ?? ".";

    if (ftpHost && ftpUser && ftpPassword) {
      const client = new FtpClient(60_000);
      try {
        await client.access({
          host: ftpHost,
          user: ftpUser,
          password: ftpPassword,
          secure: false,
        });
        const remoteSubdir = ftpRemoteDir === "." ? SOUND_EFFECTS_REMOTE_DIR : path.join(ftpRemoteDir, SOUND_EFFECTS_REMOTE_DIR).replace(/\\/g, "/");
        await client.ensureDir(remoteSubdir);
        await client.uploadFrom(filePath, id);
        const base = getFtpPublicBaseUrl();
        if (base) {
          publicUrl = `${base}/${SOUND_EFFECTS_REMOTE_DIR}/${id}`;
        }
      } catch (ftpErr) {
        console.error("[sound-effect] FTP upload error:", ftpErr);
      } finally {
        client.close();
      }
    }

    return NextResponse.json({
      id,
      url,
      ...(localPath != null && { localPath }),
      ...(publicUrl != null && { publicUrl }),
    });
  } catch (e) {
    console.error("[sound-effect] upload error", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
