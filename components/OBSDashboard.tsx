"use client";

import { useState, useEffect, useCallback } from "react";
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
  RefreshCw,
  ExternalLink,
  Settings2,
  ListOrdered,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import EventAndMatchupEditor from "./EventAndMatchupEditor";

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

  const envUrl = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_OBS_WS_URL : undefined;
  const envPassword = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_OBS_WS_PASSWORD : undefined;

  useEffect(() => {
    if (envUrl) setUrl(envUrl);
  }, [envUrl]);

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

  return (
    <>
      <Script
        src="/obs-connection.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-slate-100">
        <header className="sticky top-0 z-10 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
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
            {isConnected && (
              <button
                type="button"
                onClick={refresh}
                className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800/80 px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-700/80"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            )}
          </div>
        </header>

        <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
          {/* Connection section */}
          <section className="rounded-xl border border-slate-700/60 bg-slate-800/40 shadow-xl">
            <div
              role="button"
              tabIndex={0}
              onClick={() => setConnectionExpanded((e) => !e)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setConnectionExpanded((c) => !c); } }}
              className="flex w-full flex-wrap items-center justify-between gap-4 border-b border-slate-700/60 px-5 py-4 text-left hover:bg-slate-700/20 transition-colors rounded-t-xl cursor-pointer"
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

            <div className="grid gap-6 p-5 sm:grid-cols-2">
              <div className="space-y-4">
                <label className="block text-sm font-medium text-slate-300">WebSocket URL</label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="ws://localhost:4455"
                  disabled={isConnected}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900/80 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-70"
                />
                {!isConnected && (url || envUrl) && (
                  <p className="text-xs text-slate-500">
                    Will connect to: {(url.trim() || envUrl || DEFAULT_WS_URL).trim()}
                  </p>
                )}
                <label className="block text-sm font-medium text-slate-300">Password (optional)</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave empty if not set in OBS"
                  disabled={isConnected}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900/80 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-70"
                />
              </div>
              <div className="rounded-lg border border-slate-600/60 bg-slate-900/40 p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
                  <ListOrdered className="h-4 w-4 text-slate-400" />
                  How to connect
                </h3>
                <ol className="list-inside list-decimal space-y-2 text-sm text-slate-400">
                  <li>Open OBS Studio on the machine where it runs.</li>
                  <li>In OBS, go to <strong className="text-slate-300">Tools → WebSocket Server Settings</strong>.</li>
                  <li>Enable <strong className="text-slate-300">Enable WebSocket server</strong>.</li>
                  <li>Leave password blank if you don’t use one; otherwise enter it above.</li>
                  <li>Use <strong className="text-slate-300">ws://localhost:4455</strong> if OBS is on this PC, or <strong className="text-slate-300">ws://&lt;OBS PC IP&gt;:4455</strong> (e.g. ws://192.168.1.140:4455) if OBS is on another computer.</li>
                  <li><strong className="text-slate-300">OBS on another PC:</strong> On the OBS machine, allow port 4455 through Windows Firewall (or turn off firewall for testing). Ensure both PCs are on the same network.</li>
                  <li>Click <strong className="text-emerald-400">Connect</strong>.</li>
                </ol>
              </div>
            </div>
              </>
            )}
          </section>

          {/* Event & Matchup – inputs and preview (card + header live in EventAndMatchupEditor) */}
          <EventAndMatchupEditor />

          {!isConnected && (
            <div className="rounded-xl border border-slate-700/60 bg-slate-800/30 p-8 text-center text-slate-400">
              <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-slate-600" />
              <p className="font-medium">Connect to OBS to control scenes, stream, and recording.</p>
            </div>
          )}

          {isConnected && (
            <>
              {/* Scenes */}
              <section className="rounded-xl border border-slate-700/60 bg-slate-800/40 shadow-xl">
                <h2 className="flex items-center gap-2 border-b border-slate-700/60 px-5 py-4 text-lg font-semibold text-white">
                  <Tv className="h-5 w-5 text-slate-400" />
                  Scenes
                </h2>
                <div className="p-5">
                  {scenes.length === 0 ? (
                    <p className="text-sm text-slate-400">No scenes or loading…</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {scenes.map((s) => (
                        <button
                          key={s.sceneName}
                          type="button"
                          onClick={() => setCurrentProgramScene(s.sceneName)}
                          disabled={actionLoading !== null}
                          className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
                            currentScene === s.sceneName
                              ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                              : "border-slate-600 bg-slate-800/80 text-slate-200 hover:border-slate-500 hover:bg-slate-700/80"
                          } disabled:opacity-50`}
                        >
                          {actionLoading === `scene-${s.sceneName}` ? (
                            <Loader2 className="inline h-4 w-4 animate-spin" />
                          ) : (
                            <Circle className={`inline h-2 w-2 ${currentScene === s.sceneName ? "fill-current" : ""}`} />
                          )}{" "}
                          {s.sceneName}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* Stream & Recording */}
              <div className="grid gap-6 sm:grid-cols-2">
                <section className="rounded-xl border border-slate-700/60 bg-slate-800/40 shadow-xl">
                  <h2 className="flex items-center gap-2 border-b border-slate-700/60 px-5 py-4 text-lg font-semibold text-white">
                    <Radio className="h-5 w-5 text-slate-400" />
                    Stream
                  </h2>
                  <div className="space-y-4 p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Status</span>
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-medium ${
                          streamState === "live"
                            ? "bg-red-500/20 text-red-400"
                            : streamState === "reconnecting"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-slate-600/50 text-slate-400"
                        }`}
                      >
                        {streamState === "live" && "Live"}
                        {streamState === "reconnecting" && "Reconnecting…"}
                        {streamState === "offline" && "Offline"}
                        {streamState === "unknown" && "—"}
                      </span>
                    </div>
                    {streamTimecode && <p className="text-sm text-slate-400">Time: {streamTimecode}</p>}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={startStream}
                        disabled={streamState === "live" || actionLoading !== null}
                        className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
                      >
                        {actionLoading === "stream-start" ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Start stream"}
                      </button>
                      <button
                        type="button"
                        onClick={stopStream}
                        disabled={streamState !== "live" || actionLoading !== null}
                        className="flex-1 rounded-lg bg-red-600/80 py-2.5 text-sm font-medium text-white transition hover:bg-red-600 disabled:opacity-50"
                      >
                        {actionLoading === "stream-stop" ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Stop stream"}
                      </button>
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-slate-700/60 bg-slate-800/40 shadow-xl">
                  <h2 className="flex items-center gap-2 border-b border-slate-700/60 px-5 py-4 text-lg font-semibold text-white">
                    <Square className="h-5 w-5 text-slate-400" />
                    Recording
                  </h2>
                  <div className="space-y-4 p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Status</span>
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-medium ${
                          recordState === "recording" ? "bg-red-500/20 text-red-400" : "bg-slate-600/50 text-slate-400"
                        }`}
                      >
                        {recordState === "recording" && "Recording"}
                        {recordState === "stopped" && "Stopped"}
                        {recordState === "unknown" && "—"}
                      </span>
                    </div>
                    {recordTimecode && <p className="text-sm text-slate-400">Time: {recordTimecode}</p>}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={startRecord}
                        disabled={recordState === "recording" || actionLoading !== null}
                        className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
                      >
                        {actionLoading === "record-start" ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Start recording"}
                      </button>
                      <button
                        type="button"
                        onClick={stopRecord}
                        disabled={recordState !== "recording" || actionLoading !== null}
                        className="flex-1 rounded-lg bg-red-600/80 py-2.5 text-sm font-medium text-white transition hover:bg-red-600 disabled:opacity-50"
                      >
                        {actionLoading === "record-stop" ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Stop recording"}
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
}
