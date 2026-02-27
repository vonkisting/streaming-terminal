"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { OBS_CONNECTION_ENABLED } from "@/lib/featureFlags";

const DEFAULT_WS_URL = "ws://localhost:4455";

export default function Navbar() {
  const [obsConnected, setObsConnected] = useState(false);

  useEffect(() => {
    if (!OBS_CONNECTION_ENABLED) return;
    const url = process.env.NEXT_PUBLIC_OBS_WS_URL ?? DEFAULT_WS_URL;
    const password = process.env.NEXT_PUBLIC_OBS_WS_PASSWORD ?? "";
    if (typeof window !== "undefined") {
      if ((window as unknown as { isOBSConnected?: () => boolean }).isOBSConnected?.()) {
        setObsConnected(true);
      } else {
        (window as unknown as { __OBS_WS_CONFIG__?: { url: string; password: string } }).__OBS_WS_CONFIG__ = { url, password };
        const connect = (window as unknown as { connectOBS?: () => void }).connectOBS;
        if (typeof connect === "function") connect();
      }
    }
    const onSuccess = () => setObsConnected(true);
    const onFail = () => setObsConnected(false);
    window.addEventListener("obs-connection-success", onSuccess);
    window.addEventListener("obs-connection-fail", onFail);
    return () => {
      window.removeEventListener("obs-connection-success", onSuccess);
      window.removeEventListener("obs-connection-fail", onFail);
    };
  }, []);

  return (
    <nav className="sticky top-0 z-10 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800/50 shadow-lg">
      <div className="flex items-center h-16 px-6">
        <Link href="/" className="flex items-center gap-2">
          {OBS_CONNECTION_ENABLED && (
            <span
              className="h-6 w-6 shrink-0 rounded-full ring-2 ring-white/20"
              style={{ backgroundColor: obsConnected ? "#22c55e" : "#ef4444" }}
              title={obsConnected ? "Connected to OBS" : "Not connected to OBS"}
              aria-hidden
            />
          )}
          <span className="text-2xl font-bold text-white">Streaming Terminal</span>
        </Link>
        <Link
          href="/stream"
          className="ml-6 text-sm font-medium text-slate-400 transition hover:text-white"
        >
          Marquee & overlay
        </Link>
      </div>
    </nav>
  );
}
