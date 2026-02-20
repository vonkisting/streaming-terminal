"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function Navbar() {
  const [obsConnected, setObsConnected] = useState(false);

  useEffect(() => {
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
          <span
            className="h-3 w-3 shrink-0 rounded-full ring-2 ring-white/20"
            style={{ backgroundColor: obsConnected ? "#22c55e" : "#ef4444" }}
            title={obsConnected ? "Connected to OBS" : "Not connected to OBS"}
            aria-hidden
          />
          <span className="text-2xl font-bold text-white">Streaming Terminal</span>
        </Link>
      </div>
    </nav>
  );
}
