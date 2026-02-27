"use client";

import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import Script from "next/script";
import Link from "next/link";
import {
  Wifi,
  WifiOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Tv,
  Radio,
  Circle,
  Square,
  ExternalLink,
  Settings2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import EventAndMatchupEditor from "./EventAndMatchupEditor";
import ResizablePanel from "./ResizablePanel";

const DEFAULT_WS_URL = "ws://localhost:4455";

declare global {
  interface Window {
    __OBS_WS_CONFIG__?: { url: string; password: string };
    connectOBS?: () => void;
    disconnectOBS?: () => void;
    isOBSConnected?: () => boolean;
    obsRequest?: (requestType: string, requestData?: Record<string, unknown>) => Promise<unknown>;
  }
}

type ConnectionStatus = "idle" | "connecting" | "connected" | "failed";
type StreamState = "live" | "offline" | "reconnecting" | "unknown";
type RecordState = "recording" | "stopped" | "unknown";

interface SceneItem {
  sceneName: string;
  sceneIndex: number;
}

interface SceneListResponse {
  currentProgramSceneName?: string;
  scenes?: SceneItem[];
}

interface StreamStatusResponse {
  outputActive?: boolean;
  outputReconnecting?: boolean;
  outputTimecode?: string;
  outputDuration?: number;
}

interface RecordStatusResponse {
  outputActive?: boolean;
  outputTimecode?: string;
  outputDuration?: number;
}

type CardLayout = { x: number; y: number; w: number; h: number };
type LayoutState = Record<string, CardLayout>;

const OBS_DASHBOARD_LAYOUT_KEY = "obs-dashboard-layout";

const DEFAULT_LAYOUT: LayoutState = {
  "connect-prompt": { x: 20, y: 20, w: 260, h: 200 },
  scenes: { x: 300, y: 20, w: 260, h: 280 },
  stream: { x: 580, y: 20, w: 260, h: 220 },
  recording: { x: 580, y: 260, w: 260, h: 220 },
};

function loadLayout(): LayoutState {
  if (typeof window === "undefined") return { ...DEFAULT_LAYOUT };
  try {
    const raw = localStorage.getItem(OBS_DASHBOARD_LAYOUT_KEY);
    if (!raw) return { ...DEFAULT_LAYOUT };
    const parsed = JSON.parse(raw) as Record<string, CardLayout>;
    delete parsed.connection;
    delete parsed["event-matchup"];
    return { ...DEFAULT_LAYOUT, ...parsed };
  } catch {
    return { ...DEFAULT_LAYOUT };
  }
}

function rectsOverlap(a: CardLayout, b: CardLayout): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function resolveOverlaps(layout: LayoutState, changedId: string): LayoutState {
  const ids = Object.keys(layout);
  let result = { ...layout };
  const PAD = 8;
  const maxPasses = 10;
  for (let pass = 0; pass < maxPasses; pass++) {
    let moved = false;
    for (const id of ids) {
      if (id === changedId) continue;
      const cur = result[id];
      if (!cur) continue;
      for (const otherId of ids) {
        if (otherId === id) continue;
        const other = result[otherId];
        if (!other || !rectsOverlap(cur, other)) continue;
        const pushRight = other.x + other.w - cur.x + PAD;
        const pushLeft = cur.x + cur.w - other.x + PAD;
        const pushDown = other.y + other.h - cur.y + PAD;
        const pushUp = cur.y + cur.h - other.y + PAD;
        const candidates: { dx: number; dy: number }[] = [];
        if (pushRight > PAD && cur.x < other.x + other.w) candidates.push({ dx: pushRight, dy: 0 });
        if (pushLeft > PAD && cur.x + cur.w > other.x) candidates.push({ dx: -pushLeft, dy: 0 });
        if (pushDown > PAD && cur.y < other.y + other.h) candidates.push({ dx: 0, dy: pushDown });
        if (pushUp > PAD && cur.y + cur.h > other.y) candidates.push({ dx: 0, dy: -pushUp });
        const valid = candidates.filter((c) => Math.abs(c.dx) < 3000 && Math.abs(c.dy) < 3000);
        const best = valid.length
          ? valid.reduce((acc, c) => (Math.abs(acc.dx) + Math.abs(acc.dy) <= Math.abs(c.dx) + Math.abs(c.dy) ? acc : c))
          : null;
        if (best) {
          result = {
            ...result,
            [id]: {
              ...cur,
              x: Math.max(0, cur.x + best.dx),
              y: Math.max(0, cur.y + best.dy),
            },
          };
          moved = true;
          break;
        }
      }
    }
    if (!moved) break;
  }
  return result;
}

export default function OBSDashboard() {
  const [scriptReady, setScriptReady] = useState(false);
  const [url, setUrl] = useState(DEFAULT_WS_URL);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scenes, setScenes] = useState<SceneItem[]>([]);
  const [currentScene, setCurrentScene] = useState<string | null>(null);
  const [streamState, setStreamState] = useState<StreamState>("unknown");
  const [streamTimecode, setStreamTimecode] = useState<string>("");
  const [recordState, setRecordState] = useState<RecordState>("unknown");
  const [recordTimecode, setRecordTimecode] = useState<string>("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [connectionExpanded, setConnectionExpanded] = useState(true);
  const [layout, setLayout] = useState<LayoutState>(() => loadLayout());
  const [dragState, setDragState] = useState<{ id: string; startX: number; startY: number; startLeft: number; startTop: number } | null>(null);
  const [resizeState, setResizeState] = useState<{ id: string; startX: number; startY: number; startW: number; startH: number } | null>(null);
  const mainRef = useRef<HTMLElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.target.getBoundingClientRect();
      if (rect) setContainerSize({ w: Math.floor(rect.width), h: Math.floor(rect.height) });
    });
    ro.observe(el);
    const rect = el.getBoundingClientRect();
    setContainerSize({ w: Math.floor(rect.width), h: Math.floor(rect.height) });
    return () => ro.disconnect();
  }, []);

  const envUrl = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_OBS_WS_URL : undefined;
  const envPassword = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_OBS_WS_PASSWORD : undefined;

  useEffect(() => {
    if (envUrl) setUrl(envUrl);
  }, [envUrl]);

  useEffect(() => {
    try {
      const toSave = { ...layout };
      delete toSave.connection;
      delete toSave["event-matchup"];
      localStorage.setItem(OBS_DASHBOARD_LAYOUT_KEY, JSON.stringify(toSave));
    } catch {
      // ignore
    }
  }, [layout]);

  useEffect(() => {
    if (!dragState && !resizeState) return;
    const onMouseMove = (e: MouseEvent) => {
      if (dragState) {
        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;
        setLayout((prev) => ({
          ...prev,
          [dragState.id]: {
            ...prev[dragState.id],
            x: Math.max(0, dragState.startLeft + dx),
            y: Math.max(0, dragState.startTop + dy),
          },
        }));
      } else if (resizeState) {
        const dw = e.clientX - resizeState.startX;
        const dh = e.clientY - resizeState.startY;
        const rect = mainRef.current?.getBoundingClientRect();
        const maxW = rect ? Math.max(400, Math.floor(rect.width) - 32) : (typeof window !== "undefined" ? Math.max(400, window.innerWidth - 32) : 4000);
        const maxH = rect ? Math.max(200, Math.floor(rect.height) - 32) : (typeof window !== "undefined" ? Math.max(200, window.innerHeight - 100) : 2000);
        setLayout((prev) => {
          const cur = prev[resizeState.id] ?? DEFAULT_LAYOUT[resizeState.id];
          const minW = 200;
          const minH = 120;
          return {
            ...prev,
            [resizeState.id]: {
              ...cur,
              w: Math.max(minW, Math.min(maxW, resizeState.startW + dw)),
              h: Math.max(minH, Math.min(maxH, resizeState.startH + dh)),
            },
          };
        });
      }
    };
    const onMouseUp = () => {
      const changedId = dragState?.id ?? resizeState?.id ?? null;
      setDragState(null);
      setResizeState(null);
      if (changedId) {
        setLayout((prev) => resolveOverlaps(prev, changedId));
      }
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.body.style.cursor = dragState ? "grabbing" : "nwse-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [dragState, resizeState]);

  useEffect(() => {
    if (scriptReady) return;
    const check = () => {
      if (typeof (window as unknown as { connectOBS?: () => void }).connectOBS === "function") {
        setScriptReady(true);
      }
    };
    check();
    const t = setInterval(check, 200);
    return () => clearInterval(t);
  }, [scriptReady]);

  const connect = useCallback(() => {
    if (!scriptReady || !window.connectOBS) return;
    setErrorMessage(null);
    setStatus("connecting");
    const connectUrl = (url.trim() || envUrl || DEFAULT_WS_URL).trim();
    const connectPassword = password || envPassword || "";
    window.__OBS_WS_CONFIG__ = { url: connectUrl, password: connectPassword };
    window.connectOBS();
  }, [scriptReady, url, password, envUrl, envPassword]);

  const disconnect = useCallback(() => {
    if (window.disconnectOBS) window.disconnectOBS();
    setStatus("idle");
    setScenes([]);
    setCurrentScene(null);
    setStreamState("unknown");
    setRecordState("unknown");
  }, []);

  useEffect(() => {
    if (!scriptReady) return;
    const onStart = () => setStatus("connecting");
    const onSuccess = () => setStatus("connected");
    const onFail = (e: Event) => {
      setStatus("failed");
      setErrorMessage((e as CustomEvent<{ message?: string }>)?.detail?.message ?? "Connection failed.");
    };
    window.addEventListener("obs-connection-start", onStart);
    window.addEventListener("obs-connection-success", onSuccess);
    window.addEventListener("obs-connection-fail", onFail);
    return () => {
      window.removeEventListener("obs-connection-start", onStart);
      window.removeEventListener("obs-connection-success", onSuccess);
      window.removeEventListener("obs-connection-fail", onFail);
    };
  }, [scriptReady]);

  const fetchSceneList = useCallback(async () => {
    if (!window.obsRequest || !window.isOBSConnected?.()) return;
    try {
      const data = (await window.obsRequest("GetSceneList", {})) as SceneListResponse;
      setScenes(data?.scenes ?? []);
      setCurrentScene(data?.currentProgramSceneName ?? null);
    } catch {
      setScenes([]);
      setCurrentScene(null);
    }
  }, []);

  const fetchStreamStatus = useCallback(async () => {
    if (!window.obsRequest || !window.isOBSConnected?.()) return;
    try {
      const data = (await window.obsRequest("GetStreamStatus", {})) as StreamStatusResponse;
      if (data?.outputReconnecting) setStreamState("reconnecting");
      else if (data?.outputActive) setStreamState("live");
      else setStreamState("offline");
      setStreamTimecode(data?.outputTimecode ?? "");
    } catch {
      setStreamState("unknown");
    }
  }, []);

  const fetchRecordStatus = useCallback(async () => {
    if (!window.obsRequest || !window.isOBSConnected?.()) return;
    try {
      const data = (await window.obsRequest("GetRecordStatus", {})) as RecordStatusResponse;
      setRecordState(data?.outputActive ? "recording" : "stopped");
      setRecordTimecode(data?.outputTimecode ?? "");
    } catch {
      setRecordState("unknown");
    }
  }, []);

  useEffect(() => {
    if (status !== "connected" || !window.isOBSConnected?.()) return;
    fetchSceneList();
    fetchStreamStatus();
    fetchRecordStatus();
    const t = setInterval(() => {
      if (window.isOBSConnected?.()) {
        fetchStreamStatus();
        fetchRecordStatus();
      }
    }, 2000);
    return () => clearInterval(t);
  }, [status, fetchSceneList, fetchStreamStatus, fetchRecordStatus, refreshKey]);

  const setCurrentProgramScene = async (sceneName: string) => {
    if (!window.obsRequest) return;
    setActionLoading(`scene-${sceneName}`);
    try {
      await window.obsRequest("SetCurrentProgramScene", { sceneName });
      setCurrentScene(sceneName);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Failed to switch scene");
    } finally {
      setActionLoading(null);
    }
  };

  const startStream = async () => {
    if (!window.obsRequest) return;
    setActionLoading("stream-start");
    try {
      await window.obsRequest("StartStream", {});
      await fetchStreamStatus();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Failed to start stream");
    } finally {
      setActionLoading(null);
    }
  };

  const stopStream = async () => {
    if (!window.obsRequest) return;
    setActionLoading("stream-stop");
    try {
      await window.obsRequest("StopStream", {});
      await fetchStreamStatus();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Failed to stop stream");
    } finally {
      setActionLoading(null);
    }
  };

  const startRecord = async () => {
    if (!window.obsRequest) return;
    setActionLoading("record-start");
    try {
      await window.obsRequest("StartRecord", {});
      await fetchRecordStatus();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Failed to start recording");
    } finally {
      setActionLoading(null);
    }
  };

  const stopRecord = async () => {
    if (!window.obsRequest) return;
    setActionLoading("record-stop");
    try {
      await window.obsRequest("StopRecord", {});
      await fetchRecordStatus();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Failed to stop recording");
    } finally {
      setActionLoading(null);
    }
  };

  const refresh = () => {
    if (status === "connected") {
      fetchSceneList();
      fetchStreamStatus();
      fetchRecordStatus();
      setRefreshKey((k) => k + 1);
    }
  };

  const isConnected = status === "connected" && window.isOBSConnected?.();

  function DashboardCard({ id, children, glow }: { id: keyof LayoutState; children: ReactNode; glow?: "green" | "red" }) {
    const lay = layout[id] ?? DEFAULT_LAYOUT[id];
    if (!lay) return <>{children}</>;
    const maxW = containerSize.w > 0 ? containerSize.w : lay.w;
    const w = Math.min(lay.w, maxW);
    const glowClass = glow === "green" ? "obs-card-glow-green" : glow === "red" ? "obs-card-glow-red" : "";
    return (
      <div
        className={`flex flex-col rounded-xl border bg-slate-800/40 shadow-xl overflow-hidden ${glow ? "border-2" : "border border-slate-700/60"} ${glow === "green" ? "border-emerald-500/70" : glow === "red" ? "border-red-500/70" : ""} ${glowClass}`}
        style={{ position: "absolute", left: lay.x, top: lay.y, width: w, height: lay.h, minWidth: 200, minHeight: 120 }}
      >
        <div
          role="button"
          tabIndex={0}
          onMouseDown={(e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            setDragState({ id, startX: e.clientX, startY: e.clientY, startLeft: lay.x, startTop: lay.y });
          }}
          onKeyDown={() => {}}
          className="h-2 w-full shrink-0 cursor-grab active:cursor-grabbing bg-slate-700/40 hover:bg-slate-600/50 border-b border-slate-600/60"
          title="Drag to move"
        />
        <div className="flex-1 min-h-0 overflow-auto">{children}</div>
        <div
          role="button"
          tabIndex={0}
          onMouseDown={(e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            setResizeState({ id, startX: e.clientX, startY: e.clientY, startW: lay.w, startH: lay.h });
          }}
          className="absolute right-0 bottom-0 w-4 h-4 cursor-nwse-resize border-t border-l border-slate-500/50 rounded-tl"
          title="Resize"
          style={{ background: "linear-gradient(135deg, transparent 50%, rgba(100,116,139,0.4) 50%)" }}
        />
      </div>
    );
  }

  return (
    <>
      <Script
        src="/obs-connection.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-slate-100">
        <header className="sticky top-0 z-10 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
          <div className="mx-auto flex h-12 max-w-6xl items-center justify-start px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <Link
                href="/stream"
                className="flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white"
                title="Marquee & stream overlay"
              >
                <ExternalLink className="h-4 w-4" />
                Streaming Terminal
              </Link>
              <h1 className="text-xl font-semibold tracking-tight text-white">OBS Dashboard</h1>
            </div>
          </div>
        </header>

        <main ref={mainRef} className="flex flex-col px-4 pt-4 pb-8 min-h-[calc(100vh-3rem)] w-full">
          {/* Connection: full-width row, not draggable */}
          <section
            className={`mb-4 w-full shrink-0 rounded-xl border bg-slate-800/40 shadow-xl overflow-hidden ${isConnected ? "border-2 border-emerald-500/70 obs-card-glow-green" : "border-2 border-red-500/70 obs-card-glow-red"}`}
          >
            <div
              role="button"
              tabIndex={0}
              onClick={() => setConnectionExpanded((e) => !e)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setConnectionExpanded((c) => !c); } }}
              className="flex w-full flex-wrap items-center justify-between gap-4 border-b border-slate-700/60 px-5 py-4 text-left hover:bg-slate-700/20 transition-colors cursor-pointer"
            >
              <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                {connectionExpanded ? (
                  <ChevronDown className="h-5 w-5 text-slate-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                )}
                <Settings2 className="h-5 w-5 text-slate-400" />
                Connection
              </h2>
              <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${
                    status === "connected"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : status === "connecting"
                        ? "bg-amber-500/20 text-amber-400"
                        : status === "failed"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-slate-600/50 text-slate-400"
                  }`}
                >
                  {status === "connected" && <Wifi className="h-4 w-4" />}
                  {status === "connecting" && <Loader2 className="h-4 w-4 animate-spin" />}
                  {(status === "failed" || status === "idle") && <WifiOff className="h-4 w-4" />}
                  {status === "connected"
                    ? "Connected"
                    : status === "connecting"
                      ? "Connecting…"
                      : status === "failed"
                        ? "Failed"
                        : "Disconnected"}
                </span>
                {isConnected ? (
                  <button
                    type="button"
                    onClick={disconnect}
                    className="rounded-lg bg-red-600/80 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={connect}
                    disabled={!scriptReady || status === "connecting"}
                    title={!scriptReady ? "Loading OBS connection script…" : undefined}
                    className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {status === "connecting" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : !scriptReady ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wifi className="h-4 w-4" />
                    )}
                    {status === "connecting" ? "Connecting…" : !scriptReady ? "Loading…" : "Connect"}
                  </button>
                )}
              </div>
            </div>

            {connectionExpanded && (
              <>
            {errorMessage && (
              <div className="mx-5 mt-4 flex items-center gap-2 rounded-lg bg-red-900/30 px-4 py-3 text-sm text-red-200">
                <AlertCircle className="h-5 w-5 shrink-0" />
                {errorMessage}
              </div>
            )}

            <div className="grid grid-cols-[minmax(140px,max-content)_1fr] gap-x-4 gap-y-4 p-5 items-center">
              <label className="text-sm font-medium text-slate-300">WebSocket URL</label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="ws://localhost:4455"
                disabled={isConnected}
                className="w-full min-w-0 rounded-lg border border-slate-600 bg-slate-900/80 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-70"
              />
              <label className="text-sm font-medium text-slate-300">Password (optional)</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave empty if not set in OBS"
                disabled={isConnected}
                className="w-full min-w-0 max-w-[220px] rounded-lg border border-slate-600 bg-slate-900/80 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-70"
              />
            </div>
              </>
            )}
          </section>

          {/* Marquee row (100% width, below Connection, above Event & Matchup) + Event & Matchup row */}
          <div className="mb-4 w-full shrink-0 flex flex-col gap-4">
            <EventAndMatchupEditor
              renderMarqueeRow={(marqueeContent) => marqueeContent}
              renderSections={({ eventMatchup, standings, playerList, paths, fontSizes }) => (
                <section className="w-full shrink-0 flex flex-row flex-wrap items-stretch min-h-0 gap-4">
                  <ResizablePanel
                    defaultWidth={420}
                    storageKey="streaming-terminal-event-matchup-card-width"
                  >
                    <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 shadow-xl overflow-visible h-full min-h-0 overflow-y-auto">
                      {eventMatchup}
                    </div>
                  </ResizablePanel>
                  <ResizablePanel
                    defaultWidth={320}
                    storageKey="streaming-terminal-standings-card-width"
                  >
                    <div className="h-full min-h-0 overflow-y-auto rounded-xl border border-slate-700/60 bg-slate-800/40 shadow-xl p-4 flex flex-col gap-4">
                      {standings}
                      {playerList}
                      {fontSizes}
                      {paths}
                    </div>
                  </ResizablePanel>
                  <ResizablePanel
                    defaultWidth={280}
                    storageKey="streaming-terminal-third-column-card-width"
                  >
                  {!isConnected ? (
                    <div className="shrink-0 self-stretch min-h-0 rounded-xl border border-slate-700/60 bg-slate-800/40 shadow-xl overflow-hidden flex flex-col h-full">
                      <div className="p-8 text-center text-slate-400 flex-1 flex flex-col items-center justify-center min-h-0">
                        <CheckCircle2 className="mb-3 h-12 w-12 text-slate-600" />
                        <p className="font-medium">Connect to OBS to control scenes, stream, and recording.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="shrink-0 self-stretch min-h-0 rounded-xl border border-slate-700/60 bg-slate-800/40 shadow-xl overflow-hidden flex flex-col h-full">
                      <h2 className="flex items-center gap-2 border-b border-slate-700/60 px-4 py-3 text-base font-semibold text-white shrink-0">
                        <Settings2 className="h-4 w-4 text-slate-400" />
                        OBS Controls
                      </h2>
                      <div className="p-4 space-y-4 overflow-y-auto min-h-0 flex-1">
                        {/* Stream */}
                        <div className="rounded-lg border border-slate-600/60 bg-slate-900/40 overflow-hidden">
                          <h3 className="flex items-center gap-2 border-b border-slate-600/60 px-3 py-2 text-sm font-semibold text-slate-200">
                            <Radio className="h-4 w-4 text-slate-400" />
                            Stream
                          </h3>
                          <div className="space-y-3 p-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-400">Status</span>
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${streamState === "live" ? "bg-red-500/20 text-red-400" : streamState === "reconnecting" ? "bg-amber-500/20 text-amber-400" : "bg-slate-600/50 text-slate-400"}`}>
                                {streamState === "live" && "Live"}
                                {streamState === "reconnecting" && "Reconnecting…"}
                                {streamState === "offline" && "Offline"}
                                {streamState === "unknown" && "—"}
                              </span>
                            </div>
                            {streamTimecode && <p className="text-xs text-slate-400">Time: {streamTimecode}</p>}
                            <div className="flex gap-2">
                              <button type="button" onClick={startStream} disabled={streamState === "live" || actionLoading !== null} className="flex-1 rounded-lg bg-emerald-600 py-2 text-xs font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50">
                                {actionLoading === "stream-start" ? <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" /> : "Start stream"}
                              </button>
                              <button type="button" onClick={stopStream} disabled={streamState !== "live" || actionLoading !== null} className="flex-1 rounded-lg bg-red-600/80 py-2 text-xs font-medium text-white transition hover:bg-red-600 disabled:opacity-50">
                                {actionLoading === "stream-stop" ? <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" /> : "Stop stream"}
                              </button>
                            </div>
                          </div>
                        </div>
                        {/* Recording */}
                        <div className="rounded-lg border border-slate-600/60 bg-slate-900/40 overflow-hidden">
                          <h3 className="flex items-center gap-2 border-b border-slate-600/60 px-3 py-2 text-sm font-semibold text-slate-200">
                            <Square className="h-4 w-4 text-slate-400" />
                            Recording
                          </h3>
                          <div className="space-y-3 p-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-400">Status</span>
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${recordState === "recording" ? "bg-red-500/20 text-red-400" : "bg-slate-600/50 text-slate-400"}`}>
                                {recordState === "recording" && "Recording"}
                                {recordState === "stopped" && "Stopped"}
                                {recordState === "unknown" && "—"}
                              </span>
                            </div>
                            {recordTimecode && <p className="text-xs text-slate-400">Time: {recordTimecode}</p>}
                            <div className="flex gap-2">
                              <button type="button" onClick={startRecord} disabled={recordState === "recording" || actionLoading !== null} className="flex-1 rounded-lg bg-emerald-600 py-2 text-xs font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50">
                                {actionLoading === "record-start" ? <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" /> : "Start recording"}
                              </button>
                              <button type="button" onClick={stopRecord} disabled={recordState !== "recording" || actionLoading !== null} className="flex-1 rounded-lg bg-red-600/80 py-2 text-xs font-medium text-white transition hover:bg-red-600 disabled:opacity-50">
                                {actionLoading === "record-stop" ? <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" /> : "Stop recording"}
                              </button>
                            </div>
                          </div>
                        </div>
                        {/* Scenes */}
                        <div className="rounded-lg border border-slate-600/60 bg-slate-900/40 overflow-hidden">
                          <h3 className="flex items-center gap-2 border-b border-slate-600/60 px-3 py-2 text-sm font-semibold text-slate-200">
                            <Tv className="h-4 w-4 text-slate-400" />
                            Scenes
                          </h3>
                          <div className="p-3">
                            {scenes.length === 0 ? (
                              <p className="text-xs text-slate-400">No scenes or loading…</p>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {scenes.map((s) => (
                                  <button
                                    key={s.sceneName}
                                    type="button"
                                    onClick={() => setCurrentProgramScene(s.sceneName)}
                                    disabled={actionLoading !== null}
                                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${currentScene === s.sceneName ? "border-emerald-500 bg-emerald-500/20 text-emerald-400" : "border-slate-600 bg-slate-800/80 text-slate-200 hover:border-slate-500 hover:bg-slate-700/80"} disabled:opacity-50`}
                                  >
                                    {actionLoading === `scene-${s.sceneName}` ? <Loader2 className="inline h-3 w-3 animate-spin" /> : <Circle className={`inline h-1.5 w-1.5 ${currentScene === s.sceneName ? "fill-current" : ""}`} />}
                                    {" "}{s.sceneName}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  </ResizablePanel>
                </section>
              )}
            />
          </div>

          {/* Spacer / future cards area */}
          <div className="relative flex-1 min-h-[120px] w-full" />
        </main>
      </div>
    </>
  );
}
