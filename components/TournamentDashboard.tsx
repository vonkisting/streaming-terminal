"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useMarquee } from "./TournamentMarqueeContext";

export default function TournamentDashboard() {
  const { streamUrl, setStreamUrl, setStreamPlaying, showOBSPreview, setShowOBSPreview, marqueePath, matchupCardPath } = useMarquee();
  const [pathsExpanded, setPathsExpanded] = useState(true);
  const [showCopyNotification, setShowCopyNotification] = useState(false);
  const copyNotificationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyNotificationTimeoutRef.current) clearTimeout(copyNotificationTimeoutRef.current);
    };
  }, []);

  const copyPath = (path: string) => {
    if (!path) return;
    navigator.clipboard.writeText(path).then(() => {
      if (copyNotificationTimeoutRef.current) clearTimeout(copyNotificationTimeoutRef.current);
      setShowCopyNotification(true);
      copyNotificationTimeoutRef.current = setTimeout(() => {
        setShowCopyNotification(false);
        copyNotificationTimeoutRef.current = null;
      }, 3000);
    });
  };

  return (
    <div className="w-full min-w-0 max-w-full p-2 space-y-2">
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6 shadow-lg min-w-0">
        <button
          type="button"
          onClick={() => setPathsExpanded((prev) => !prev)}
          className="flex items-center gap-2 w-full text-left text-sm font-medium text-slate-300 mb-3 hover:text-white transition-colors"
        >
          {pathsExpanded ? (
            <ChevronDown className="w-4 h-4 shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 shrink-0" />
          )}
          Paths
        </button>
        {pathsExpanded && (
          <>
            <label className="block text-sm font-medium text-slate-300 mb-2">Stream URL</label>
            <div className="flex gap-2 min-w-0">
              <input
                type="url"
                value={streamUrl}
                onChange={(e) => {
                  const v = e.target.value;
                  setStreamUrl(v);
                  if (!v.trim()) setStreamPlaying(false);
                }}
                placeholder="Paste video URL"
                className="flex-1 min-w-0 px-4 py-1.5 text-xs bg-slate-900/80 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => streamUrl.trim() && setStreamPlaying(true)}
                disabled={!streamUrl.trim()}
                className="shrink-0 w-16 min-w-[4rem] px-4 py-1.5 text-xs font-medium bg-slate-600 hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Play
              </button>
            </div>
            <label className="flex items-center gap-2 mt-3 cursor-pointer" title="Requires OBS Studio 26+ (Tools → Start Virtual Camera) or another virtual camera that outputs OBS.">
              <input
                type="checkbox"
                checked={showOBSPreview}
                onChange={(e) => setShowOBSPreview(e.target.checked)}
                className="rounded border-slate-500 bg-slate-800 text-slate-200 focus:ring-slate-500"
              />
              <span className="text-sm text-slate-300">Show OBS output in content area (camera)</span>
            </label>
            <label className="block text-sm font-medium text-slate-300 mt-3 mb-2">Marquee Path</label>
            <div className="flex gap-2 min-w-0">
              <input
                type="text"
                readOnly
                value={marqueePath}
                placeholder="Set on OBS Dashboard"
                className="flex-1 min-w-0 px-4 py-1.5 text-xs bg-slate-900/80 border border-slate-600/50 rounded-lg text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => copyPath(marqueePath)}
                disabled={!marqueePath}
                className="shrink-0 w-16 min-w-[4rem] px-4 py-1.5 text-xs font-medium bg-slate-600 hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Copy
              </button>
            </div>
            <label className="block text-sm font-medium text-slate-300 mt-3 mb-2">Matchup Card Path</label>
            <div className="flex gap-2 min-w-0">
              <input
                type="text"
                readOnly
                value={matchupCardPath}
                placeholder="Set on OBS Dashboard"
                className="flex-1 min-w-0 px-4 py-1.5 text-xs bg-slate-900/80 border border-slate-600/50 rounded-lg text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => copyPath(matchupCardPath)}
                disabled={!matchupCardPath}
                className="shrink-0 w-16 min-w-[4rem] px-4 py-1.5 text-xs font-medium bg-slate-600 hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Copy
              </button>
            </div>
          </>
        )}
      </div>

      {showCopyNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-slate-800 border border-slate-600 rounded-xl px-6 py-4 shadow-xl text-slate-200 text-sm font-medium">
            Path copied to clipboard
          </div>
        </div>
      )}
    </div>
  );
}
