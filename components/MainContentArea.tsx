"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { useMarquee } from "./TournamentMarqueeContext";

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
  const { streamUrl, streamPlaying, showOBSPreview } = useMarquee();
  const videoRef = useRef<HTMLVideoElement>(null);
  const obsCameraRef = useRef<HTMLVideoElement>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [obsCameraError, setObsCameraError] = useState<string | null>(null);
  const [obsCameraStream, setObsCameraStream] = useState<MediaStream | null>(null);
  const trimmedUrl = streamUrl?.trim() ?? "";
  const showStream = Boolean(trimmedUrl) && streamPlaying;

  // OBS Virtual Camera: request on button click; then show device picker so user can choose OBS Virtual Camera
  const obsCameraStreamRef = useRef<MediaStream | null>(null);
  const [obsCameraRequesting, setObsCameraRequesting] = useState(false);
  const [videoDevices, setVideoDevices] = useState<{ deviceId: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");

  useEffect(() => {
    if (!showOBSPreview && obsCameraStreamRef.current) {
      obsCameraStreamRef.current.getTracks().forEach((t) => t.stop());
      obsCameraStreamRef.current = null;
      setObsCameraStream(null);
      setObsCameraError(null);
      setVideoDevices([]);
      setSelectedCameraId("");
    }
  }, [showOBSPreview]);

  const switchCamera = async (deviceId: string) => {
    if (!navigator.mediaDevices?.getUserMedia || !deviceId) return;
    setSelectedCameraId(deviceId);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: false,
      });
      if (obsCameraStreamRef.current) obsCameraStreamRef.current.getTracks().forEach((t) => t.stop());
      obsCameraStreamRef.current = stream;
      setObsCameraStream(stream);
      setObsCameraError(null);
    } catch {
      setObsCameraError("Could not switch to that camera.");
    }
  };

  const requestOBSCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setObsCameraError("Camera access is not supported in this browser.");
      return;
    }
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setObsCameraError("Camera only works on HTTPS or localhost. Open this site at http://localhost:3000 (not 127.0.0.1 or an IP address) and try again.");
      return;
    }
    setObsCameraError(null);
    setObsCameraRequesting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices
        .filter((d) => d.kind === "videoinput")
        .map((d) => ({ deviceId: d.deviceId, label: d.label || `Camera ${d.deviceId.slice(0, 8)}` }));
      setVideoDevices(videoInputs);
      const obsDevice = videoInputs.find(
        (d) => d.label.toLowerCase().includes("obs") || d.label.toLowerCase().includes("virtual")
      );
      if (obsDevice && videoInputs.length > 1) {
        const currentId = stream.getVideoTracks()[0]?.getSettings().deviceId;
        if (currentId !== obsDevice.deviceId) {
          stream.getTracks().forEach((t) => t.stop());
          const obsStream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: obsDevice.deviceId } },
            audio: false,
          });
          if (obsCameraStreamRef.current) obsCameraStreamRef.current.getTracks().forEach((t) => t.stop());
          obsCameraStreamRef.current = obsStream;
          setObsCameraStream(obsStream);
          setSelectedCameraId(obsDevice.deviceId);
        } else {
          if (obsCameraStreamRef.current) obsCameraStreamRef.current.getTracks().forEach((t) => t.stop());
          obsCameraStreamRef.current = stream;
          setObsCameraStream(stream);
          setSelectedCameraId(stream.getVideoTracks()[0]?.getSettings().deviceId ?? videoInputs[0]?.deviceId ?? "");
        }
      } else {
        if (obsCameraStreamRef.current) obsCameraStreamRef.current.getTracks().forEach((t) => t.stop());
        obsCameraStreamRef.current = stream;
        setObsCameraStream(stream);
        setSelectedCameraId(stream.getVideoTracks()[0]?.getSettings().deviceId ?? videoInputs[0]?.deviceId ?? "");
      }
      setObsCameraError(null);
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      const msg = err instanceof Error ? err.message : String(err);
      if (name === "NotAllowedError" || msg.includes("Permission") || msg.includes("NotAllowed") || msg.includes("denied")) {
        setObsCameraError(
          "Camera was blocked. Try: (1) Open this site at http://localhost:3000 in the address bar (not 127.0.0.1). " +
            "(2) Click the lock or info icon in the address bar → Site settings → Camera → set to Allow or Ask. " +
            "(3) Or try in a private/incognito window and click the button again."
        );
      } else if (name === "NotFoundError") {
        setObsCameraError("No camera found. Start OBS Virtual Camera (Tools in OBS) and try again.");
      } else if (name === "NotReadableError") {
        setObsCameraError(
          "Camera is in use or not readable. Try: (1) Close other apps or tabs using the camera (Zoom, Teams, other browser tabs). " +
            "(2) In OBS, stop Virtual Camera then start it again. (3) If you already see a Camera dropdown above, pick OBS Virtual Camera from it. (4) Reload this page and click the button once."
        );
      } else {
        setObsCameraError(
          `${name || "Error"}: Camera couldn’t open. Use http://localhost:3000, allow camera when the browser asks, then use the Camera dropdown to select OBS Virtual Camera.`
        );
      }
      setObsCameraStream(null);
      setVideoDevices([]);
      setSelectedCameraId("");
    } finally {
      setObsCameraRequesting(false);
    }
  };

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

  useEffect(() => {
    const el = obsCameraRef.current;
    if (!el || !obsCameraStream) return;
    el.srcObject = obsCameraStream;
    el.play().catch(() => {});
  }, [obsCameraStream]);

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
      {/* Full-screen OBS Virtual Camera output */}
      {showOBSPreview && (
        <div className="absolute inset-0 w-full h-full overflow-hidden min-w-0 z-30 bg-black">
          {obsCameraStream ? (
            <>
              {videoDevices.length > 1 && (
                <div className="absolute top-3 left-3 right-3 z-40 flex justify-center">
                  <label className="flex items-center gap-2 rounded-lg bg-black/70 px-3 py-2 border border-slate-600/50">
                    <span className="text-xs text-slate-400 whitespace-nowrap">Camera:</span>
                    <select
                      value={selectedCameraId}
                      onChange={(e) => switchCamera(e.target.value)}
                      className="bg-slate-800 text-slate-200 text-sm rounded px-2 py-1 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500 min-w-[180px]"
                    >
                      {videoDevices.map((d) => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
              <video
                ref={obsCameraRef}
                className="absolute inset-0 w-full h-full min-w-full min-h-full object-contain object-center"
                autoPlay
                muted
                playsInline
              />
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
              <p className="text-slate-400 text-center max-w-lg">
                {obsCameraError ||
                  "Click the button below. If the browser asks for camera access, allow it (you can pick any camera). Once video appears, use the Camera dropdown at the top to switch to OBS Virtual Camera. Use http://localhost:3000 if you get no prompt."}
              </p>
              <button
                type="button"
                onClick={requestOBSCamera}
                disabled={obsCameraRequesting}
                className="px-5 py-2.5 rounded-lg font-medium bg-slate-600 hover:bg-slate-500 disabled:opacity-50 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-black"
              >
                {obsCameraRequesting ? "Opening camera…" : obsCameraError ? "Try again" : "Allow camera to show OBS output"}
              </button>
            </div>
          )}
        </div>
      )}
      {!showOBSPreview && showStream && (
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
      {videoError && !showOBSPreview && (
        <div className="absolute inset-x-0 top-4 z-20 mx-4 rounded-lg bg-red-900/90 px-4 py-2 text-sm text-red-100 shadow-lg">
          {videoError}
        </div>
      )}
    </div>
  );
}
