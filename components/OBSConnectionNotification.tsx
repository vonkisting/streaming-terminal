"use client";

import { useState, useEffect } from "react";

type NotificationType = "info" | "success" | "error";

interface NotificationState {
  message: string;
  type: NotificationType;
}

const AUTO_DISMISS_MS = 5000;

export default function OBSConnectionNotification() {
  const [notification, setNotification] = useState<NotificationState | null>(null);

  useEffect(() => {
    const onStart = () => setNotification({ message: "Connecting to OBS...", type: "info" });
    const onSuccess = () => setNotification({ message: "Connected to OBS", type: "success" });
    const onFail = (e: Event) => {
      const detail = (e as CustomEvent<{ message?: string }>).detail;
      setNotification({
        message: detail?.message ?? "OBS connection failed",
        type: "error",
      });
    };

    window.addEventListener("obs-connection-start", onStart);
    window.addEventListener("obs-connection-success", onSuccess);
    window.addEventListener("obs-connection-fail", onFail);

    return () => {
      window.removeEventListener("obs-connection-start", onStart);
      window.removeEventListener("obs-connection-success", onSuccess);
      window.removeEventListener("obs-connection-fail", onFail);
    };
  }, []);

  useEffect(() => {
    if (!notification) return;
    // Keep "Connecting..." visible until success/fail replaces it (connection can take a long time)
    if (notification.type === "info") return;
    const t = setTimeout(() => setNotification(null), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [notification]);

  if (!notification) return null;

  const styles = {
    info: "border-slate-500/60 bg-slate-800/95 text-slate-200",
    success: "border-emerald-500/60 bg-emerald-950/95 text-emerald-200",
    error: "border-red-500/60 bg-red-950/95 text-red-200",
  };

  return (
    <div
      className={`fixed top-3 left-1/2 z-50 -translate-x-1/2 rounded-lg border px-4 py-2.5 shadow-lg ${styles[notification.type]}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">{notification.message}</span>
        <button
          type="button"
          onClick={() => setNotification(null)}
          className="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium opacity-80 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/50"
          aria-label="Dismiss"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
