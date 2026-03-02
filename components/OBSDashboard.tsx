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
  Volume2,
  Upload,
  Play,
  Trash2,
} from "lucide-react";
import EventAndMatchupEditor from "./EventAndMatchupEditor";
import ResizablePanel from "./ResizablePanel";

const WS_URL_OPTIONS = [
  "ws://192.168.0.63:4455",
  "ws://100.109.136.115:4455",
  "ws://localhost:4455",
] as const;
const WS_URL_CUSTOM = "__custom__";
const OBS_WS_URL_STORAGE_KEY = "streaming-terminal-obs-ws-url";
const CUSTOM_WS_URLS_STORAGE_KEY = "streaming-terminal-custom-ws-urls";
const MAX_SAVED_CUSTOM_URLS = 20;
const OBS_WS_PASSWORD_STORAGE_KEY = "streaming-terminal-obs-ws-password";

function loadLastObsWsUrl(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(OBS_WS_URL_STORAGE_KEY) ?? "";
}
function loadLastObsWsPassword(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(OBS_WS_PASSWORD_STORAGE_KEY) ?? "";
}
function loadSavedCustomWsUrls(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_WS_URLS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((u): u is string => typeof u === "string" && (u.startsWith("ws://") || u.startsWith("wss://"))).slice(0, MAX_SAVED_CUSTOM_URLS);
  } catch {
    return [];
  }
}

function saveCustomWsUrl(url: string): void {
  const trimmed = url.trim();
  if (!trimmed || (!trimmed.startsWith("ws://") && !trimmed.startsWith("wss://"))) return;
  const current = loadSavedCustomWsUrls();
  const without = current.filter((u) => u !== trimmed);
  const next = [trimmed, ...without].slice(0, MAX_SAVED_CUSTOM_URLS);
  try {
    localStorage.setItem(CUSTOM_WS_URLS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

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

interface SoundEffectItem {
  id: string;
  name: string;
  file: File;
  publicUrl?: string;
}

const AUDIO_ACCEPT = "audio/*";
const SOUND_EFFECTS_VLC_SOURCE_NAME = "Sound Effects VLC Source";
const SOUND_EFFECTS_DB_NAME = "streaming-terminal-sound-effects";
const SOUND_EFFECTS_STORE = "sound-effects";

function openSoundEffectsDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(SOUND_EFFECTS_DB_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(SOUND_EFFECTS_STORE)) {
        db.createObjectStore(SOUND_EFFECTS_STORE, { keyPath: "id" });
      }
    };
  });
}

function loadSoundEffectsFromDb(): Promise<SoundEffectItem[]> {
  return openSoundEffectsDb().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SOUND_EFFECTS_STORE, "readonly");
      const store = tx.objectStore(SOUND_EFFECTS_STORE);
      const req = store.getAll();
      req.onerror = () => { db.close(); reject(req.error); };
      req.onsuccess = () => {
        db.close();
        const rows = (req.result as { id: string; name: string; file: Blob; publicUrl?: string }[]) ?? [];
        const items: SoundEffectItem[] = rows.map((r) => ({
          id: r.id,
          name: r.name,
          file: new File([r.file], r.name, { type: r.file.type }),
          ...(r.publicUrl != null && { publicUrl: r.publicUrl }),
        }));
        resolve(items);
      };
    });
  });
}

function saveSoundEffectToDb(item: SoundEffectItem): Promise<void> {
  return openSoundEffectsDb().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SOUND_EFFECTS_STORE, "readwrite");
      const store = tx.objectStore(SOUND_EFFECTS_STORE);
      store.put({ id: item.id, name: item.name, file: item.file, ...(item.publicUrl != null && { publicUrl: item.publicUrl }) });
      tx.onerror = () => { db.close(); reject(tx.error); };
      tx.oncomplete = () => { db.close(); resolve(); };
    });
  });
}

function deleteSoundEffectFromDb(id: string): Promise<void> {
  return openSoundEffectsDb().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SOUND_EFFECTS_STORE, "readwrite");
      const store = tx.objectStore(SOUND_EFFECTS_STORE);
      store.delete(id);
      tx.onerror = () => { db.close(); reject(tx.error); };
      tx.oncomplete = () => { db.close(); resolve(); };
    });
  });
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
  const [url, setUrl] = useState(loadLastObsWsUrl);
  const [password, setPassword] = useState(loadLastObsWsPassword);
  const [savedCustomUrls, setSavedCustomUrls] = useState<string[]>(loadSavedCustomWsUrls);
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scenes, setScenes] = useState<SceneItem[]>([]);
  const [currentScene, setCurrentScene] = useState<string | null>(null);
  const [streamState, setStreamState] = useState<StreamState>("unknown");
  const [streamTimecode, setStreamTimecode] = useState<string>("");
  const [recordState, setRecordState] = useState<RecordState>("unknown");
  const [recordTimecode, setRecordTimecode] = useState<string>("");
  const [streamExpanded, setStreamExpanded] = useState(true);
  const [recordingExpanded, setRecordingExpanded] = useState(true);
  const [scenesExpanded, setScenesExpanded] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [connectionExpanded, setConnectionExpanded] = useState(true);
  const [settingsCardExpanded, setSettingsCardExpanded] = useState(true);
  const [soundEffectsCardExpanded, setSoundEffectsCardExpanded] = useState(false);
  const [layout, setLayout] = useState<LayoutState>(() => loadLayout());
  const [dragState, setDragState] = useState<{ id: string; startX: number; startY: number; startLeft: number; startTop: number } | null>(null);
  const [resizeState, setResizeState] = useState<{ id: string; startX: number; startY: number; startW: number; startH: number } | null>(null);
  const mainRef = useRef<HTMLElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [soundFiles, setSoundFiles] = useState<SoundEffectItem[]>([]);
  const [soundDropActive, setSoundDropActive] = useState(false);
  const soundFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSoundEffectsFromDb()
      .then((items) => setSoundFiles(items))
      .catch(() => {});
  }, []);

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
    const connectUrl = url.trim();
    if (!scriptReady || !window.connectOBS || !connectUrl) return;
    setErrorMessage(null);
    setStatus("connecting");
    const connectPassword = password.trim();
    try {
      localStorage.setItem(OBS_WS_URL_STORAGE_KEY, connectUrl);
      localStorage.setItem(OBS_WS_PASSWORD_STORAGE_KEY, connectPassword);
      if (!WS_URL_OPTIONS.includes(connectUrl as (typeof WS_URL_OPTIONS)[number])) {
        saveCustomWsUrl(connectUrl);
        setSavedCustomUrls(loadSavedCustomWsUrls());
      }
    } catch {
      // ignore
    }
    window.__OBS_WS_CONFIG__ = { url: connectUrl, password: connectPassword };
    window.connectOBS();
  }, [scriptReady, url, password]);

  const disconnect = useCallback(() => {
    if (window.disconnectOBS) window.disconnectOBS();
    setStatus("idle");
    setScenes([]);
    setCurrentScene(null);
    setStreamState("unknown");
    setRecordState("unknown");
  }, []);

  const addSoundFiles = useCallback((files: FileList | File[]) => {
    const list = Array.from(files);
    const audio = list.filter((f) => f.type.startsWith("audio/"));
    if (audio.length === 0) return;
    const newItems: SoundEffectItem[] = audio.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: file.name,
      file,
    }));
    setSoundFiles((prev) => [...prev, ...newItems]);
    newItems.forEach((item) => {
      saveSoundEffectToDb(item).catch(() => {});
      const form = new FormData();
      form.set("file", item.file);
      fetch("/api/sound-effect", { method: "POST", body: form })
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Upload failed"))))
        .then((data: { publicUrl?: string }) => {
          if (data.publicUrl) {
            setSoundFiles((prev) =>
              prev.map((i) => (i.id === item.id ? { ...i, publicUrl: data.publicUrl } : i))
            );
            saveSoundEffectToDb({ ...item, publicUrl: data.publicUrl }).catch(() => {});
          }
        })
        .catch(() => {});
    });
  }, []);

  const removeSoundFile = useCallback((id: string) => {
    setSoundFiles((prev) => prev.filter((f) => f.id !== id));
    deleteSoundEffectFromDb(id).catch(() => {});
  }, []);

  const playSoundInOBS = useCallback(async (item: SoundEffectItem) => {
    if (!window.obsRequest || !window.isOBSConnected?.()) {
      setErrorMessage("Connect to OBS first to play sound effects.");
      return;
    }
    setActionLoading(`sound-${item.id}`);
    setErrorMessage(null);
    try {
      let fileSource: string;
      if (item.publicUrl) {
        fileSource = item.publicUrl;
      } else {
        const form = new FormData();
        form.set("file", item.file);
        const uploadRes = await fetch("/api/sound-effect", { method: "POST", body: form });
        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => ({}));
          throw new Error(err?.error ?? "Upload failed");
        }
        const data = (await uploadRes.json()) as { id: string; url: string; localPath?: string; publicUrl?: string };
        fileSource = data.publicUrl ?? data.localPath ?? data.url;
      }

      const sceneData = (await window.obsRequest!("GetCurrentProgramScene", {})) as { currentProgramSceneName?: string };
      const sceneName = sceneData?.currentProgramSceneName;
      if (!sceneName) {
        throw new Error("No active scene in OBS. Switch to a scene first.");
      }

      try {
        await window.obsRequest!("CreateInput", {
          sceneName,
          inputName: SOUND_EFFECTS_VLC_SOURCE_NAME,
          inputKind: "vlc_source",
          inputSettings: { playlist: [], loop: false },
          sceneItemEnabled: true,
        });
      } catch (createErr) {
        const msg = createErr instanceof Error ? createErr.message : String(createErr);
        if (!/already exists|duplicate|resource/i.test(msg)) {
          throw createErr;
        }
      }

      try {
        await window.obsRequest!("SetInputAudioMonitorType", {
          inputName: SOUND_EFFECTS_VLC_SOURCE_NAME,
          monitorType: "OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT",
        });
      } catch {
        // ignore if unsupported
      }

      await window.obsRequest!("SetInputSettings", {
        inputName: SOUND_EFFECTS_VLC_SOURCE_NAME,
        inputSettings: {
          playlist: [{ value: fileSource, hidden: false, selected: true }],
          loop: false,
        },
        overlay: false,
      });

      await new Promise((r) => setTimeout(r, 300));

      await window.obsRequest!("TriggerMediaInputAction", {
        inputName: SOUND_EFFECTS_VLC_SOURCE_NAME,
        mediaAction: "OBS_MEDIA_INPUT_ACTION_RESTART",
      });

      const endStates = ["OBS_MEDIA_STATE_ENDED", "OBS_MEDIA_STATE_STOPPED", "OBS_MEDIA_STATE_ERROR", "OBS_MEDIA_STATE_NONE"];
      for (let i = 0; i < 600; i++) {
        await new Promise((r) => setTimeout(r, 250));
        try {
          const status = (await window.obsRequest!("GetMediaInputStatus", { inputName: SOUND_EFFECTS_VLC_SOURCE_NAME })) as { mediaState?: string };
          if (status?.mediaState && endStates.includes(status.mediaState)) break;
        } catch {
          break;
        }
      }

      try {
        const listData = (await window.obsRequest!("GetSceneItemList", { sceneName })) as { sceneItems?: { sceneItemId: number; sourceName?: string }[] };
        const vlcItem = listData?.sceneItems?.find((i) => i.sourceName === SOUND_EFFECTS_VLC_SOURCE_NAME);
        if (vlcItem != null) {
          await window.obsRequest!("RemoveSceneItem", { sceneName, sceneItemId: vlcItem.sceneItemId });
        }
      } catch {
        // ignore
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg && !msg.includes("invalid media input action")) {
        setErrorMessage(msg || "Sound effect failed.");
      }
    } finally {
      setActionLoading(null);
    }
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

  useEffect(() => {
    if (!isConnected) {
      setSoundEffectsCardExpanded(false);
      setSettingsCardExpanded(false);
    }
  }, [isConnected]);

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

        <main
          ref={mainRef}
          className={`flex flex-col px-4 pt-4 pb-8 min-h-[calc(100vh-3rem)] w-full rounded-xl ${isConnected ? "border-2 border-emerald-500/70 obs-card-glow-green" : "border-2 border-red-500/70 obs-card-glow-red"}`}
        >
          {/* Connection: full-width row, not draggable */}
          <section className="mb-4 w-full shrink-0 rounded-xl border border-slate-700/60 bg-slate-800/40 shadow-xl overflow-hidden">
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
                    disabled={!scriptReady || status === "connecting" || !url.trim()}
                    title={!scriptReady ? "Loading OBS connection script…" : !url.trim() ? "Select or enter a WebSocket URL" : undefined}
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

            {errorMessage && (
              <div className="mx-5 mt-4 flex items-center gap-2 rounded-lg bg-red-900/30 px-4 py-3 text-sm text-red-200">
                <AlertCircle className="h-5 w-5 shrink-0" />
                {errorMessage}
              </div>
            )}

            {connectionExpanded && (
              <>
            <div className="grid grid-cols-[minmax(140px,max-content)_1fr] gap-x-4 gap-y-4 p-5 items-center">
              <label className="text-sm font-medium text-slate-300">WebSocket URL</label>
              <div className="flex flex-col gap-2 min-w-0">
                <select
                  value={
                    WS_URL_OPTIONS.includes(url as (typeof WS_URL_OPTIONS)[number]) || savedCustomUrls.includes(url)
                      ? url
                      : WS_URL_CUSTOM
                  }
                  onChange={(e) => setUrl(e.target.value === WS_URL_CUSTOM ? "" : e.target.value)}
                  disabled={isConnected}
                  className="w-full min-w-0 rounded-lg border border-slate-600 bg-slate-900/80 px-4 py-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-70"
                >
                  {WS_URL_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                  {savedCustomUrls.filter((u) => !WS_URL_OPTIONS.includes(u as (typeof WS_URL_OPTIONS)[number])).map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                  <option value={WS_URL_CUSTOM}>Custom…</option>
                </select>
                {(!url || (!WS_URL_OPTIONS.includes(url as (typeof WS_URL_OPTIONS)[number]) && !savedCustomUrls.includes(url))) && (
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="e.g. ws://localhost:4455"
                    disabled={isConnected}
                    className="w-full min-w-0 rounded-lg border border-slate-600 bg-slate-900/80 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-70"
                  />
                )}
              </div>
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
              obsConnected={isConnected}
              renderMarqueeRow={(marqueeContent) => marqueeContent}
              renderSections={({ eventMatchup, standings, playerList, paths, fontSizes }) => (
                <section className="w-full shrink-0 flex flex-row flex-wrap items-stretch min-h-0 gap-4">
                  <ResizablePanel
                    defaultWidth={420}
                    storageKey="streaming-terminal-event-matchup-card-width"
                    contentOverflowVisible
                  >
                    <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 shadow-xl overflow-visible h-full min-h-0 overflow-y-auto">
                      {eventMatchup}
                    </div>
                  </ResizablePanel>
                  <ResizablePanel
                    defaultWidth={320}
                    storageKey="streaming-terminal-standings-card-width"
                  >
                    <div className="h-full min-h-0 flex flex-col rounded-xl border border-slate-700/60 bg-slate-800/40 shadow-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => { if (!isConnected) return; setSettingsCardExpanded((e) => !e); }}
                        className="flex w-full items-center gap-2 border-b border-slate-700/60 px-4 py-3 text-left text-base font-semibold text-white hover:bg-slate-700/20 transition-colors shrink-0 disabled:opacity-70"
                        title={!isConnected ? "Connect to OBS to open Settings" : undefined}
                      >
                        {settingsCardExpanded ? <ChevronDown className="h-5 w-5 text-slate-400" /> : <ChevronRight className="h-5 w-5 text-slate-400" />}
                        <Settings2 className="h-5 w-5 text-slate-400" />
                        Settings
                      </button>
                      {settingsCardExpanded && (
                        <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-4">
                          {standings}
                          {playerList}
                          {fontSizes}
                          {paths}
                        </div>
                      )}
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
                          <button type="button" onClick={() => setStreamExpanded((e) => !e)} className="flex w-full items-center gap-2 border-b border-slate-600/60 px-3 py-2 text-left text-sm font-semibold text-slate-200 hover:bg-slate-700/30 transition-colors">
                            {streamExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                            <Radio className="h-4 w-4 text-slate-400" />
                            Stream
                          </button>
                          {streamExpanded && (
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
                          )}
                        </div>
                        {/* Recording */}
                        <div className="rounded-lg border border-slate-600/60 bg-slate-900/40 overflow-hidden">
                          <button type="button" onClick={() => setRecordingExpanded((e) => !e)} className="flex w-full items-center gap-2 border-b border-slate-600/60 px-3 py-2 text-left text-sm font-semibold text-slate-200 hover:bg-slate-700/30 transition-colors">
                            {recordingExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                            <Square className="h-4 w-4 text-slate-400" />
                            Recording
                          </button>
                          {recordingExpanded && (
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
                          )}
                        </div>
                        {/* Scenes */}
                        <div className="rounded-lg border border-slate-600/60 bg-slate-900/40 overflow-hidden">
                          <button type="button" onClick={() => setScenesExpanded((e) => !e)} className="flex w-full items-center gap-2 border-b border-slate-600/60 px-3 py-2 text-left text-sm font-semibold text-slate-200 hover:bg-slate-700/30 transition-colors">
                            {scenesExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                            <Tv className="h-4 w-4 text-slate-400" />
                            Scenes
                          </button>
                          {scenesExpanded && (
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
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  </ResizablePanel>
                  <ResizablePanel
                    defaultWidth={240}
                    storageKey="streaming-terminal-sound-effects-card-width"
                  >
                    <div className="shrink-0 self-stretch min-h-0 rounded-xl border border-slate-700/60 bg-slate-800/40 shadow-xl overflow-hidden flex flex-col h-full">
                      <button
                        type="button"
                        onClick={() => { if (!isConnected) return; setSoundEffectsCardExpanded((e) => !e); }}
                        className="flex w-full items-center gap-2 border-b border-slate-700/60 px-4 py-3 text-left text-base font-semibold text-white hover:bg-slate-700/20 transition-colors shrink-0 disabled:opacity-70"
                        title={!isConnected ? "Connect to OBS to open Sound Effects" : undefined}
                      >
                        {soundEffectsCardExpanded ? <ChevronDown className="h-5 w-5 text-slate-400" /> : <ChevronRight className="h-5 w-5 text-slate-400" />}
                        <Volume2 className="h-5 w-5 text-slate-400" />
                        Sound Effects
                      </button>
                      {soundEffectsCardExpanded && (
                      <div className="p-4 overflow-y-auto min-h-0 flex-1 flex flex-col gap-3">
                        <input
                          ref={soundFileInputRef}
                          type="file"
                          accept={AUDIO_ACCEPT}
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            const files = e.target.files;
                            if (files?.length) addSoundFiles(files);
                            e.target.value = "";
                          }}
                        />
                        <div
                          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setSoundDropActive(true); }}
                          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setSoundDropActive(false); }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSoundDropActive(false);
                            if (e.dataTransfer.files.length) addSoundFiles(e.dataTransfer.files);
                          }}
                          onClick={() => soundFileInputRef.current?.click()}
                          className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-3 py-4 text-center cursor-pointer transition-colors ${soundDropActive ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : "border-slate-600 bg-slate-900/40 text-slate-400 hover:border-slate-500 hover:bg-slate-800/60"}`}
                        >
                          <Upload className="h-6 w-6 shrink-0" />
                          <span className="text-xs font-medium">Drop audio files or click to browse</span>
                        </div>
                        {soundFiles.length > 0 && (
                          <ul className="flex flex-col gap-1.5 min-w-0">
                            {soundFiles.map((item) => (
                              <li key={item.id} className="flex items-center gap-2 rounded-lg border border-slate-600/60 bg-slate-800/60 px-2 py-1.5 min-w-0">
                                <span className="truncate text-sm text-slate-200 flex-1 min-w-0" title={item.name}>{item.name}</span>
                                <button type="button" onClick={() => playSoundInOBS(item)} disabled={!isConnected || actionLoading !== null} className="shrink-0 p-1 rounded text-slate-400 hover:text-emerald-400 hover:bg-slate-700/80 transition-colors disabled:opacity-50" title={isConnected ? "Play in OBS" : "Connect to OBS to play"}>
                                  {actionLoading === `sound-${item.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                                </button>
                                <button type="button" onClick={() => removeSoundFile(item.id)} className="shrink-0 p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-700/80 transition-colors" title="Remove">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      )}
                    </div>
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
