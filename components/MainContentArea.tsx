"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { useMarquee } from "./TournamentMarqueeContext";
import MarqueeBanner from "./MarqueeBanner";
import MatchupCard from "./MatchupCard";

function getYouTubeVideoId(value: string): string | null {
  if (!value) return null;
  try {
    const u = value.trim();
    // Match watch URL, embed URL, or youtu.be - or embed code containing these
    const ytMatch = u.match(/(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtube\.com\/v\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return ytMatch ? ytMatch[1] : null;
  } catch {
    return null;
  }
}

function getVimeoVideoId(value: string): string | null {
  if (!value) return null;
  try {
    const u = value.trim();
    const vimeoMatch = u.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/);
    return vimeoMatch ? vimeoMatch[1] : null;
  } catch {
    return null;
  }
}

/** If pasted value contains an iframe src with a known embed URL, return that URL. */
function getEmbedUrlFromCode(value: string): string | null {
  if (!value) return null;
  try {
    const srcMatch = value.match(/src=["'](https?:\/\/[^"']+)["']/i);
    const url = srcMatch?.[1]?.trim();
    if (!url) return null;
    if (url.includes("youtube.com/embed/") || url.includes("youtu.be/") || url.includes("player.vimeo.com/video/")) {
      return url;
    }
    return null;
  } catch {
    return null;
  }
}

function ensureAutoplay(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set("autoplay", "1");
    return u.toString();
  } catch {
    return url;
  }
}

export default function MainContentArea() {
  const { streamUrl, streamPlaying } = useMarquee();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const trimmedUrl = streamUrl?.trim() ?? "";
  const showStream = Boolean(trimmedUrl) && streamPlaying;

  const embedInfo = useMemo(() => {
    const fromCode = getEmbedUrlFromCode(trimmedUrl);
    if (fromCode) return { type: "embed" as const, url: ensureAutoplay(fromCode) };
    const ytId = getYouTubeVideoId(trimmedUrl);
    if (ytId) return { type: "youtube" as const, id: ytId };
    const vimeoId = getVimeoVideoId(trimmedUrl);
    if (vimeoId) return { type: "vimeo" as const, id: vimeoId };
    return null;
  }, [trimmedUrl]);

  const isEmbed = embedInfo?.type === "embed";
  const isYouTube = embedInfo?.type === "youtube";
  const isVimeo = embedInfo?.type === "vimeo";
  const isIframeStream = Boolean(isEmbed || isYouTube || isVimeo);

  useEffect(() => {
    setVideoError(null);
  }, [trimmedUrl]);

  useEffect(() => {
    if (!streamPlaying) setVideoError(null);
  }, [streamPlaying]);

  useEffect(() => {
    if (!showStream || isIframeStream || !videoRef.current) return;
    const video = videoRef.current;
    const play = () => {
      video.play().catch(() => {});
    };
    if (video.readyState >= 3) play();
    else {
      video.addEventListener("canplay", play, { once: true });
      return () => video.removeEventListener("canplay", play);
    }
  }, [showStream, trimmedUrl, isIframeStream]);

  const handleVideoError = () => {
    const video = videoRef.current;
    const err = video?.error;
    let message = "Video failed to load. Use a direct video URL (e.g. .mp4 or .webm).";
    if (err) {
      const code = err.code;
      const raw = (err.message ?? "").toLowerCase();
      if (code === 4 || raw.includes("format") || raw.includes("not supported")) {
        message = "Format not supported. Use a direct .mp4 or .webm file URL (not YouTube/Twitch links).";
      } else if (code === 2 || raw.includes("network")) {
        message = "Network error. Check the URL and your connection.";
      } else if (code === 3 || raw.includes("decode")) {
        message = "Video could not be decoded. Try a different file or format (.mp4, .webm).";
      } else if (err.message) {
        message = err.message;
      }
    }
    setVideoError(message);
  };

  const iframeSrc =
    embedInfo?.type === "embed"
      ? embedInfo.url
      : embedInfo?.type === "youtube"
        ? `https://www.youtube.com/embed/${embedInfo.id}?autoplay=1&mute=0`
        : embedInfo?.type === "vimeo"
          ? `https://player.vimeo.com/video/${embedInfo.id}?autoplay=1`
          : null;

  return (
    <div className="flex-1 min-h-0 relative flex flex-col h-full overflow-hidden min-w-0">
      {showStream && (
        <div className="absolute inset-0 w-full h-full overflow-hidden min-w-0">
          {iframeSrc ? (
            <iframe
              key={iframeSrc}
              src={iframeSrc}
              title="Stream embed"
              className="absolute inset-0 w-full h-full min-w-full min-h-full pointer-events-none border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video
              ref={videoRef}
              key={trimmedUrl}
              className="absolute inset-0 w-full h-full min-w-full min-h-full object-cover object-center pointer-events-none"
              src={trimmedUrl}
              autoPlay
              muted={false}
              loop
              playsInline
              preload="auto"
              onError={handleVideoError}
            />
          )}
        </div>
      )}
      {videoError && (
        <div className="absolute inset-x-0 top-4 z-20 mx-4 rounded-lg bg-red-900/90 px-4 py-2 text-sm text-red-100 shadow-lg">
          {videoError}
        </div>
      )}
      <div className={`flex-1 min-h-0 flex flex-col overflow-hidden min-w-0 ${showStream ? "relative z-10" : ""}`}>
        <div className="flex-1 min-h-0 overflow-auto min-w-0">
          <MarqueeBanner />
          <div className="flex-1 min-h-0" />
        </div>
        <div className="flex-shrink-0">
          <MatchupCard />
        </div>
      </div>
    </div>
  );
}
