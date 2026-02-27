"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useMarquee } from "./TournamentMarqueeContext";
import MarqueeBanner from "./MarqueeBanner";
import MatchupCard from "./MatchupCard";

const STORAGE_KEY = "streaming-terminal-tournaments";
const ROUND_OPTIONS = ["Championship Match", "Hot Seat Match", "Losers Side", "Winners Side"];
const DEFAULT_EVENT_NAME_FONT_SIZE = 12;
const DEFAULT_SUB_TEXT_FONT_SIZE = 12;
const DEFAULT_PLAYER_NAME_FONT_SIZE = 18;
const DEFAULT_MARQUEE_FONT_SIZE = 18;

interface TournamentData {
  eventName: string;
  playerCount: number;
  playerNames: string[];
  marqueeEnabled: boolean;
  marqueeSpeed: number;
  standings: Record<number, number>;
  showMatchupScore: boolean;
  showMatchupRace: boolean;
  currentMatchupPlayer1: number;
  currentMatchupPlayer2: number;
  matchupPlayer1Score: number;
  matchupPlayer2Score: number;
  matchupPlayer1Race: string;
  matchupPlayer2Race: string;
  matchupRound: string;
  matchupWhoseTurn: 1 | 2;
  matchupSuit: 1 | 2;
  suitsImagesSwapped: boolean;
  eventNameFontSize: number;
  subTextFontSize: number;
  playerNameFontSize: number;
  marqueeFontSize: number;
  streamUrl: string;
}

function getStoredData(): Record<string, TournamentData> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export default function EventAndMatchupEditor() {
  const { setMarquee, setMarqueePath, setMatchupCardPath, marqueePath, matchupCardPath } = useMarquee();
  const [savedEvents, setSavedEvents] = useState<Record<string, TournamentData>>({});
  const [loadedEventKey, setLoadedEventKey] = useState<string | null>(null);
  const [eventName, setEventName] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [playerCount, setPlayerCount] = useState(0);
  const [playerNames, setPlayerNames] = useState<string[]>([]);
  const [marqueeEnabled, setMarqueeEnabled] = useState(false);
  const [marqueeSpeed, setMarqueeSpeed] = useState(50);
  const [standingsExpanded, setStandingsExpanded] = useState(true);
  const [standings, setStandings] = useState<Record<number, number>>({});
  const [saveMessage, setSaveMessage] = useState("");
  const [currentMatchupPlayer1, setCurrentMatchupPlayer1] = useState<number>(-1);
  const [currentMatchupPlayer2, setCurrentMatchupPlayer2] = useState<number>(-1);
  const [showMatchupScore, setShowMatchupScore] = useState(false);
  const [showMatchupRace, setShowMatchupRace] = useState(false);
  const [matchupPlayer1Score, setMatchupPlayer1Score] = useState(0);
  const [matchupPlayer2Score, setMatchupPlayer2Score] = useState(0);
  const [matchupPlayer1Race, setMatchupPlayer1Race] = useState("1");
  const [matchupPlayer2Race, setMatchupPlayer2Race] = useState("1");
  const [matchupRound, setMatchupRound] = useState("");
  const [matchupWhoseTurn, setMatchupWhoseTurn] = useState<1 | 2>(1);
  const [matchupSuit, setMatchupSuit] = useState<1 | 2>(1);
  const [suitsImagesSwapped, setSuitsImagesSwapped] = useState(false);
  const [eventNameFontSize, setEventNameFontSize] = useState(DEFAULT_EVENT_NAME_FONT_SIZE);
  const [subTextFontSize, setSubTextFontSize] = useState(DEFAULT_SUB_TEXT_FONT_SIZE);
  const [playerNameFontSize, setPlayerNameFontSize] = useState(DEFAULT_PLAYER_NAME_FONT_SIZE);
  const [marqueeFontSize, setMarqueeFontSize] = useState(DEFAULT_MARQUEE_FONT_SIZE);
  const [fontSizesExpanded, setFontSizesExpanded] = useState(true);
  const [marqueeExpanded, setMarqueeExpanded] = useState(true);
  const [playerListExpanded, setPlayerListExpanded] = useState(true);
  const [eventMatchupSectionExpanded, setEventMatchupSectionExpanded] = useState(true);
  const [pathsExpanded, setPathsExpanded] = useState(true);
  const [matchupCardExpanded, setMatchupCardExpanded] = useState(true);
  const [refreshMarqueeError, setRefreshMarqueeError] = useState<string | null>(null);
  const [showNameTakenModal, setShowNameTakenModal] = useState(false);
  const [lastMarqueeUploadAt, setLastMarqueeUploadAt] = useState<string | null>(null);
  const [showCopyNotification, setShowCopyNotification] = useState(false);
  const copyNotificationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMarqueeKeyRef = useRef<string>("");
  const lastMatchupKeyRef = useRef<string>("");
  const [turnFontSize, setTurnFontSize] = useState(14);
  const turnToggleRef = useRef<HTMLDivElement>(null);
  const turnMeasureRef = useRef<HTMLSpanElement>(null);
  useEffect(() => setSavedEvents(getStoredData()), []);

  const clearToDefaults = useCallback((newEventName: string) => {
    setEventName(newEventName);
    setPlayerCount(0);
    setPlayerNames([]);
    setMarqueeEnabled(false);
    setMarqueeSpeed(50);
    setStandings({});
    setCurrentMatchupPlayer1(-1);
    setCurrentMatchupPlayer2(-1);
    setShowMatchupScore(false);
    setShowMatchupRace(false);
    setMatchupPlayer1Score(0);
    setMatchupPlayer2Score(0);
    setMatchupPlayer1Race("1");
    setMatchupPlayer2Race("1");
    setMatchupRound("");
    setMatchupWhoseTurn(1);
    setMatchupSuit(1);
    setSuitsImagesSwapped(false);
    setEventNameFontSize(DEFAULT_EVENT_NAME_FONT_SIZE);
    setSubTextFontSize(DEFAULT_SUB_TEXT_FONT_SIZE);
    setPlayerNameFontSize(DEFAULT_PLAYER_NAME_FONT_SIZE);
    setMarqueeFontSize(DEFAULT_MARQUEE_FONT_SIZE);
  }, []);

  const loadEvent = useCallback((name: string) => {
    const data = savedEvents[name];
    if (!data) return;
    setEventName(data.eventName);
    setPlayerCount(data.playerCount);
    setPlayerNames(data.playerNames);
    setMarqueeEnabled(data.marqueeEnabled);
    setMarqueeSpeed(data.marqueeSpeed ?? 50);
    setStandings(data.standings ?? {});
    setShowMatchupScore(data.showMatchupScore ?? false);
    setShowMatchupRace(data.showMatchupRace ?? false);
    setCurrentMatchupPlayer1(data.currentMatchupPlayer1 ?? -1);
    setCurrentMatchupPlayer2(data.currentMatchupPlayer2 ?? -1);
    setMatchupPlayer1Score(data.matchupPlayer1Score ?? 0);
    setMatchupPlayer2Score(data.matchupPlayer2Score ?? 0);
    setMatchupPlayer1Race(data.matchupPlayer1Race ?? "1");
    setMatchupPlayer2Race(data.matchupPlayer2Race ?? "1");
    setMatchupRound(data.matchupRound ?? "");
    setMatchupWhoseTurn((data.matchupWhoseTurn === 1 || data.matchupWhoseTurn === 2) ? data.matchupWhoseTurn : 1);
    setMatchupSuit((data.matchupSuit === 1 || data.matchupSuit === 2) ? data.matchupSuit : 1);
    setSuitsImagesSwapped(Boolean(data.suitsImagesSwapped));
    setEventNameFontSize(data.eventNameFontSize ?? DEFAULT_EVENT_NAME_FONT_SIZE);
    setSubTextFontSize(data.subTextFontSize ?? DEFAULT_SUB_TEXT_FONT_SIZE);
    setPlayerNameFontSize(data.playerNameFontSize ?? DEFAULT_PLAYER_NAME_FONT_SIZE);
    setMarqueeFontSize(data.marqueeFontSize ?? DEFAULT_MARQUEE_FONT_SIZE);
  }, [savedEvents]);

  const collapseSections = useCallback(() => {
    setFontSizesExpanded(false);
    setMarqueeExpanded(false);
    setPlayerListExpanded(false);
    setStandingsExpanded(false);
  }, []);

  const handleSelectNone = () => {
    setEventName("");
    clearToDefaults("");
    setLoadedEventKey(null);
    setDropdownOpen(false);
    collapseSections();
  };

  const handleSelectSavedEvent = (name: string) => {
    setEventName(name);
    loadEvent(name);
    setLoadedEventKey(name);
    setDropdownOpen(false);
    collapseSections();
  };

  const handleEventNameChange = (value: string) => {
    setEventName(value);
    const trimmed = value.trim();
    if (trimmed && savedEvents[trimmed]) {
      loadEvent(trimmed);
      setLoadedEventKey(trimmed);
      collapseSections();
    } else {
      setLoadedEventKey(null);
      if (!trimmed || !savedEvents[trimmed]) clearToDefaults(value);
      collapseSections();
    }
  };

  const buildEventData = useCallback((): TournamentData => ({
    eventName: eventName.trim(),
    playerCount,
    playerNames,
    marqueeEnabled,
    marqueeSpeed,
    standings,
    showMatchupScore,
    showMatchupRace,
    currentMatchupPlayer1,
    currentMatchupPlayer2,
    matchupPlayer1Score,
    matchupPlayer2Score,
    matchupPlayer1Race,
    matchupPlayer2Race,
    matchupRound,
    matchupWhoseTurn,
    matchupSuit,
    suitsImagesSwapped,
    eventNameFontSize,
    subTextFontSize,
    playerNameFontSize,
    marqueeFontSize,
    streamUrl: "",
  }), [
    eventName, playerCount, playerNames, marqueeEnabled, marqueeSpeed, standings,
    showMatchupScore, showMatchupRace, currentMatchupPlayer1, currentMatchupPlayer2,
    matchupPlayer1Score, matchupPlayer2Score, matchupPlayer1Race, matchupPlayer2Race,
    matchupRound, matchupWhoseTurn, matchupSuit, suitsImagesSwapped,
    eventNameFontSize, subTextFontSize, playerNameFontSize, marqueeFontSize,
  ]);

  const handleCreate = () => {
    const name = eventName.trim();
    if (!name) return;
    if (savedEvents[name]) {
      setShowNameTakenModal(true);
      return;
    }
    const data = buildEventData();
    (data as TournamentData).eventName = name;
    const next = { ...getStoredData(), [name]: data };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSavedEvents(next);
    setLoadedEventKey(name);
    setSaveMessage("");
  };

  useEffect(() => {
    if (!loadedEventKey || !savedEvents[loadedEventKey]) return;
    const data = buildEventData();
    (data as TournamentData).eventName = loadedEventKey;
    const next = { ...getStoredData(), [loadedEventKey]: data };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSavedEvents((prev) => ({ ...prev, [loadedEventKey]: data }));
  }, [
    loadedEventKey, playerCount, playerNames, marqueeEnabled, marqueeSpeed, standings,
    showMatchupScore, showMatchupRace, currentMatchupPlayer1, currentMatchupPlayer2,
    matchupPlayer1Score, matchupPlayer2Score, matchupPlayer1Race, matchupPlayer2Race,
    matchupRound, matchupWhoseTurn, matchupSuit, suitsImagesSwapped,
    eventNameFontSize, subTextFontSize, playerNameFontSize, marqueeFontSize,
  ]);

  const marqueePayload = {
    eventName,
    standings,
    playerNames,
    marqueeEnabled,
    marqueeSpeed,
    currentMatchupPlayer1,
    currentMatchupPlayer2,
    showMatchupScore,
    showMatchupRace,
    matchupPlayer1Score,
    matchupPlayer2Score,
    matchupPlayer1Race,
    matchupPlayer2Race,
    matchupRound,
    matchupWhoseTurn,
    matchupSuit,
    suitsImagesSwapped,
    eventNameFontSize,
    subTextFontSize,
    playerNameFontSize,
    marqueeFontSize,
  };

  const marqueeKey = JSON.stringify({ marqueeEnabled, marqueeSpeed, eventName, standings, playerNames, marqueeFontSize });
  const matchupKey = JSON.stringify({
    eventName, currentMatchupPlayer1, currentMatchupPlayer2, showMatchupScore, showMatchupRace,
    matchupPlayer1Score, matchupPlayer2Score, matchupPlayer1Race, matchupPlayer2Race,
    matchupRound, matchupWhoseTurn, matchupSuit, suitsImagesSwapped,
    eventNameFontSize, subTextFontSize, playerNameFontSize,
  });

  useEffect(() => {
    setMarquee(marqueePayload);
    fetch("/api/overlay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marquee: marqueePayload }),
    })
      .then((r) => r.json())
      .then((data) => {
        const pathToShow = (data?.marqueeUrl ?? data?.path ?? data?.savedPath ?? "").trim();
        if (pathToShow) setMarqueePath(pathToShow);
        const matchupPath = (data?.matchupCardUrl ?? "").trim();
        if (matchupPath) setMatchupCardPath(matchupPath);
        if (data?.githubUploadedAt) setLastMarqueeUploadAt(data.githubUploadedAt);
        if (data?.ok && typeof window !== "undefined") {
          const win = window as unknown as { obsRequest?: (type: string, data?: Record<string, unknown>) => Promise<unknown>; isOBSConnected?: () => boolean; reloadBrowserSource?: (name: string) => Promise<void> };
          if (win.obsRequest && win.isOBSConnected?.()) {
            const origin = typeof window !== "undefined" ? window.location.origin : "";
            const obsBaseUrl = (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_OBS_BASE_URL) || (origin.includes("localhost") ? origin.replace(/localhost/i, "127.0.0.1") : origin);
            const base = (pathToShow || "").trim();
            const useLocalMarqueeRoute = !base.startsWith("http");
            const cacheBust = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

            if (marqueeKey !== lastMarqueeKeyRef.current && marqueeEnabled) {
              lastMarqueeKeyRef.current = marqueeKey;
              const fullUrl = useLocalMarqueeRoute
                ? `${obsBaseUrl}/marquee/${encodeURIComponent(cacheBust)}`
                : base.startsWith("http")
                  ? base
                  : obsBaseUrl + (base.startsWith("/") ? base : "/" + base);
              const cacheBustedUrl = useLocalMarqueeRoute ? fullUrl : fullUrl + (fullUrl.includes("?") ? "&" : "?") + "v=" + encodeURIComponent(cacheBust) + "&t=" + Date.now();
              win.obsRequest("SetInputSettings", { inputName: "Marquee", inputSettings: { url: cacheBustedUrl } })
                .then(() => setTimeout(() => win.reloadBrowserSource?.("Marquee")?.catch(() => {}), 300))
                .catch(() => {});
            }

            if (matchupKey !== lastMatchupKeyRef.current) {
              lastMatchupKeyRef.current = matchupKey;
              const matchupBase = (data?.matchupCardUrl ?? "").trim();
              const useLocalMatchupRoute = !matchupBase.startsWith("http");
              const matchupCardUrl = useLocalMatchupRoute
                ? `${obsBaseUrl}/matchupcard/${encodeURIComponent(cacheBust)}`
                : matchupBase;
              (async () => {
                try {
                  const sceneData = (await win.obsRequest!("GetCurrentProgramScene", {})) as { currentProgramSceneName?: string };
                  const sceneName = sceneData?.currentProgramSceneName;
                  if (!sceneName) return;
                  let listData = (await win.obsRequest!("GetSceneItemList", { sceneName })) as { sceneItems?: { sceneItemId: number; sourceName?: string }[] };
                  let matchupItem = listData?.sceneItems?.find((i) => i.sourceName === "Matchup Card");
                  if (matchupItem == null) {
                    try {
                      await win.obsRequest!("CreateInput", {
                        sceneName,
                        inputName: "Matchup Card",
                        inputKind: "browser_source",
                        inputSettings: { url: matchupCardUrl, width: 1920, height: 1080 },
                      });
                    } catch (createErr) {
                      const errMsg = String(createErr ?? "");
                      if (errMsg.includes("already") || errMsg.includes("exists")) {
                        await win.obsRequest!("CreateSceneItem", { sceneName, sourceName: "Matchup Card" }).catch(() => {});
                      }
                    }
                    listData = (await win.obsRequest!("GetSceneItemList", { sceneName })) as { sceneItems?: { sceneItemId: number; sourceName?: string }[] };
                    matchupItem = listData?.sceneItems?.find((i) => i.sourceName === "Matchup Card");
                  }
                  if (matchupItem != null) {
                    await win.obsRequest!("SetSceneItemEnabled", { sceneName, sceneItemId: matchupItem.sceneItemId, sceneItemEnabled: true });
                  }
                  await win.obsRequest!("SetInputSettings", { inputName: "Matchup Card", inputSettings: { url: matchupCardUrl } });
                  const reloadMatchup = () => win.reloadBrowserSource?.("Matchup Card")?.catch(() => {});
                  setTimeout(reloadMatchup, 300);
                  if (useLocalMatchupRoute === false) {
                    setTimeout(reloadMatchup, 3000);
                    setTimeout(reloadMatchup, 8000);
                  }
                } catch (_) {}
              })();
            }
          }
        }
      })
      .catch(() => {});
  }, [
    eventName, standings, playerNames, marqueeEnabled, marqueeSpeed,
    currentMatchupPlayer1, currentMatchupPlayer2, showMatchupScore, showMatchupRace,
    matchupPlayer1Score, matchupPlayer2Score, matchupPlayer1Race, matchupPlayer2Race,
    matchupRound, matchupWhoseTurn, matchupSuit, suitsImagesSwapped,
    eventNameFontSize, subTextFontSize, playerNameFontSize, marqueeFontSize,
    setMarquee, setMarqueePath, setMatchupCardPath,
  ]);

  useEffect(() => {
    const count = Math.max(0, Math.min(128, playerCount));
    setPlayerNames((prev) => {
      const next = [...prev];
      if (next.length < count) return [...next, ...Array(count - next.length).fill("")];
      return next.slice(0, count);
    });
  }, [playerCount]);

  const handlePlayerNameChange = (index: number, value: string) => {
    setPlayerNames((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleStandingChange = (position: number, playerIndex: number) => {
    setStandings((prev) => {
      const next = { ...prev };
      if (playerIndex === -1) delete next[position];
      else next[position] = playerIndex;
      return next;
    });
  };

  const getAvailablePlayersForPosition = (currentPosition: number) => {
    const selectedPlayerIndices = Object.entries(standings)
      .filter(([pos]) => Number(pos) !== currentPosition)
      .map(([, idx]) => idx);
    return playerNames
      .map((name, index) => ({ index, name: name || `Player ${index + 1}` }))
      .filter(({ index }) => !selectedPlayerIndices.includes(index));
  };

  const positionSuffix = (n: number) => {
    if (n % 10 === 1 && n !== 11) return "st";
    if (n % 10 === 2 && n !== 12) return "nd";
    if (n % 10 === 3 && n !== 13) return "rd";
    return "th";
  };

  const playerOptionsSorted = playerNames
    .map((name, index) => ({ index, displayName: name || `Player ${index + 1}` }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" }));

  const hasEventLoaded = eventName.trim() !== "" && eventName.trim() !== "< None >";
  const turnName1 = currentMatchupPlayer1 >= 0 ? (playerNames[currentMatchupPlayer1] || `Player ${currentMatchupPlayer1 + 1}`) : "Player 1";
  const turnName2 = currentMatchupPlayer2 >= 0 ? (playerNames[currentMatchupPlayer2] || `Player ${currentMatchupPlayer2 + 1}`) : "Player 2";
  const turnLongerName = turnName1.length >= turnName2.length ? turnName1 : turnName2;

  useEffect(() => {
    const container = turnToggleRef.current;
    const measure = turnMeasureRef.current;
    if (!container || !measure) return;
    const updateSize = () => {
      const containerWidth = container.offsetWidth;
      const padding = 16;
      const maxW = Math.max(40, (containerWidth - padding) / 2);
      for (let size = 14; size >= 8; size--) {
        measure.style.fontSize = `${size}px`;
        if (measure.offsetWidth <= maxW) {
          setTurnFontSize(size);
          return;
        }
      }
      setTurnFontSize(8);
    };
    const ro = new ResizeObserver(updateSize);
    ro.observe(container);
    updateSize();
    return () => ro.disconnect();
  }, [turnLongerName]);

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

  // When "Display Marquee Banner" is on and OBS is connected, add or show marquee browser source in current scene; when off, hide it.
  useEffect(() => {
    const win = typeof window !== "undefined" ? window : null;
    const obsRequest = win?.obsRequest as ((type: string, data?: Record<string, unknown>) => Promise<unknown>) | undefined;
    const isConnected = win?.isOBSConnected?.();
    if (!obsRequest || !isConnected) return;

    const getMarqueeUrl = (): string => {
      const base = marqueePath?.trim() || "/marquee.html";
      if (base.startsWith("http://") || base.startsWith("https://")) return base;
      const origin = win?.location?.origin ?? "";
      return origin + (base.startsWith("/") ? base : "/" + base);
    };

    if (marqueeEnabled) {
      const marqueeUrl = getMarqueeUrl();
      (async () => {
        try {
          const sceneData = (await obsRequest("GetCurrentProgramScene", {})) as { currentProgramSceneName?: string };
          const sceneName = sceneData?.currentProgramSceneName;
          if (!sceneName) return;

          const listData = (await obsRequest("GetSceneItemList", { sceneName })) as { sceneItems?: { sceneItemId: number; sourceName?: string }[] };
          const items = listData?.sceneItems ?? [];
          const marqueeItem = items.find((i) => i.sourceName === "Marquee");

          if (marqueeItem != null) {
            await obsRequest("SetInputSettings", { inputName: "Marquee", inputSettings: { url: marqueeUrl } });
            await obsRequest("SetSceneItemEnabled", { sceneName, sceneItemId: marqueeItem.sceneItemId, sceneItemEnabled: true });
            const reload = (win as unknown as { reloadBrowserSource?: (name: string) => Promise<void> }).reloadBrowserSource;
            if (typeof reload === "function") await reload("Marquee").catch(() => {});
          } else {
            try {
              await obsRequest("CreateInput", {
                sceneName,
                inputName: "Marquee",
                inputKind: "browser_source",
                inputSettings: { url: marqueeUrl, width: 1920, height: 120 },
              });
            } catch (createErr) {
              const errMsg = String(createErr ?? "");
              if (errMsg.includes("already") || errMsg.includes("exists")) {
                await obsRequest("CreateSceneItem", { sceneName, sourceName: "Marquee" }).catch(() => {});
                await obsRequest("SetInputSettings", { inputName: "Marquee", inputSettings: { url: marqueeUrl } });
                const reload = (win as unknown as { reloadBrowserSource?: (name: string) => Promise<void> }).reloadBrowserSource;
                if (typeof reload === "function") await reload("Marquee").catch(() => {});
              }
            }
          }
        } catch (_) {
          // OBS not ready or request failed; ignore
        }
      })();
    } else {
      (async () => {
        try {
          const sceneData = (await obsRequest("GetCurrentProgramScene", {})) as { currentProgramSceneName?: string };
          const sceneName = sceneData?.currentProgramSceneName;
          if (!sceneName) return;
          const listData = (await obsRequest("GetSceneItemList", { sceneName })) as { sceneItems?: { sceneItemId: number; sourceName?: string }[] };
          const marqueeItem = listData?.sceneItems?.find((i) => i.sourceName === "Marquee");
          if (marqueeItem != null) {
            await obsRequest("SetSceneItemEnabled", { sceneName, sceneItemId: marqueeItem.sceneItemId, sceneItemEnabled: false });
          }
        } catch (_) {}
      })();
    }
  }, [marqueeEnabled, marqueePath]);

  return (
    <section className="rounded-xl border border-slate-700/60 bg-slate-800/40 shadow-xl overflow-visible">
      {/* Header: Event & Matchup (collapsible) + event input */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-700/60 px-5 py-3">
        <button
          type="button"
          onClick={() => setEventMatchupSectionExpanded((p) => !p)}
          className="flex items-center gap-2 text-left text-lg font-semibold text-white hover:opacity-90 transition-opacity"
        >
          {eventMatchupSectionExpanded ? <ChevronDown className="w-5 h-5 shrink-0" /> : <ChevronRight className="w-5 h-5 shrink-0" />}
          Event & Matchup
        </button>
        <div className="ml-auto flex items-center gap-2 min-w-0" onClick={(e) => e.stopPropagation()}>
          <div className="relative min-w-0 w-64 max-w-[min(100%,20rem)]">
            <input
              type="text"
              value={eventName}
              onChange={(e) => handleEventNameChange(e.target.value)}
              onFocus={() => setDropdownOpen(true)}
              onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
              placeholder="Event name or select saved"
              className="w-full min-w-0 px-4 py-2 pr-8 text-sm bg-slate-900/80 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
            <button type="button" onClick={() => setDropdownOpen((o) => !o)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white" tabIndex={-1}>
              <ChevronDown className="w-4 h-4" />
            </button>
            {dropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                <button type="button" className="w-full text-left px-4 py-2 text-slate-200 hover:bg-slate-700 text-sm border-b border-slate-600/50" onMouseDown={() => handleSelectNone()}>&lt; None &gt;</button>
                {Object.keys(savedEvents).map((name) => (
                  <button key={name} type="button" className="w-full text-left px-4 py-2 text-slate-200 hover:bg-slate-700 text-sm" onMouseDown={() => handleSelectSavedEvent(name)}>{name}</button>
                ))}
              </div>
            )}
          </div>
          {loadedEventKey === null && (
            <button type="button" onClick={handleCreate} className="shrink-0 px-4 py-2 text-xs font-medium bg-slate-600 hover:bg-slate-500 text-white rounded-lg">Create</button>
          )}
        </div>
        {saveMessage && <span className="text-sm text-slate-400">{saveMessage}</span>}
      </div>

      {eventMatchupSectionExpanded && (
        <div className="p-5 overflow-visible space-y-6">
      {hasEventLoaded && (
        <>
      {/* Matchup */}
      <div className="rounded-lg border border-slate-600/60 bg-slate-800/40 overflow-visible">
        <button
          type="button"
          onClick={() => setMatchupCardExpanded((p) => !p)}
          className="flex w-full items-center gap-2 p-4 text-left text-sm font-semibold text-slate-300 hover:bg-slate-700/30 transition-colors"
        >
          {matchupCardExpanded ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
          Matchup
        </button>
        {matchupCardExpanded && (
          <div className="px-4 pb-4 pt-0 min-h-0 overflow-visible space-y-4">
            <div className="rounded-lg border border-slate-600/60 bg-slate-900/40 p-4 min-h-0 overflow-visible pt-4">
              <MatchupCard />
            </div>
            {hasEventLoaded && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <label className="text-slate-500 text-sm w-16 shrink-0">Player 1</label>
                  <select value={currentMatchupPlayer1} onChange={(e) => { const v = parseInt(e.target.value, 10); setCurrentMatchupPlayer1(v); if (v === currentMatchupPlayer2) setCurrentMatchupPlayer2(-1); }} className="flex-1 min-w-0 px-3 py-1.5 text-sm bg-slate-900/80 border border-slate-600 rounded text-white">
                    <option value={-1}>— Select —</option>
                    {playerOptionsSorted.map(({ index, displayName }) => index !== currentMatchupPlayer2 && <option key={index} value={index}>{displayName}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-slate-500 text-sm w-16 shrink-0">Player 2</label>
                  <select value={currentMatchupPlayer2} onChange={(e) => { const v = parseInt(e.target.value, 10); setCurrentMatchupPlayer2(v); if (v === currentMatchupPlayer1) setCurrentMatchupPlayer1(-1); }} className="flex-1 min-w-0 px-3 py-1.5 text-sm bg-slate-900/80 border border-slate-600 rounded text-white">
                    <option value={-1}>— Select —</option>
                    {playerOptionsSorted.map(({ index, displayName }) => index !== currentMatchupPlayer1 && <option key={index} value={index}>{displayName}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-slate-500 text-sm w-16 shrink-0">Round</label>
                  <select value={matchupRound} onChange={(e) => setMatchupRound(e.target.value)} className="flex-1 min-w-0 px-3 py-1.5 text-sm bg-slate-900/80 border border-slate-600 rounded text-white">
                    <option value="">— Select —</option>
                    {ROUND_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-slate-500 text-sm w-16 shrink-0">Turn</label>
                  <div ref={turnToggleRef} className="flex min-w-0 flex-1 max-w-sm rounded-lg overflow-hidden border border-slate-600 bg-slate-900/80" role="group">
                    <span ref={turnMeasureRef} className="absolute -left-[9999px] whitespace-nowrap font-bold" aria-hidden>{turnLongerName}</span>
                    <button type="button" onClick={() => setMatchupWhoseTurn(1)} style={{ fontSize: `${turnFontSize}px` }} className={`flex-1 py-2 px-2 font-bold ${matchupWhoseTurn === 1 ? "bg-red-700/90 text-white" : "text-slate-400 hover:bg-slate-700/50"}`}>{turnName1}</button>
                    <button type="button" onClick={() => setMatchupWhoseTurn(2)} style={{ fontSize: `${turnFontSize}px` }} className={`flex-1 py-2 px-2 font-bold ${matchupWhoseTurn === 2 ? "bg-blue-700/90 text-white" : "text-slate-400 hover:bg-slate-700/50"}`}>{turnName2}</button>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <label className="text-slate-500 text-sm w-16 shrink-0 pt-2">Suit</label>
                  <div className="flex flex-1 min-w-0 max-w-sm flex flex-col gap-2">
                    <div className="flex rounded-lg overflow-hidden border border-slate-600 bg-slate-900/80">
                      <button type="button" onClick={() => setMatchupSuit(1)} className="flex-1 flex items-center justify-center py-2" aria-pressed={matchupSuit === 1}>
                        <img src={suitsImagesSwapped ? "/pool-ball-15.png" : "/pool-ball-1.png"} alt="1" className="w-8 h-8 object-contain" />
                      </button>
                      <button type="button" onClick={() => setMatchupSuit(2)} className="flex-1 flex items-center justify-center py-2" aria-pressed={matchupSuit === 2}>
                        <img src={suitsImagesSwapped ? "/pool-ball-1.png" : "/pool-ball-15.png"} alt="15" className="w-8 h-8 object-contain" />
                      </button>
                    </div>
                    <button type="button" onClick={() => setSuitsImagesSwapped((s) => !s)} className="w-full py-2 text-sm font-medium rounded-lg bg-slate-700/80 text-slate-200 hover:bg-slate-600/80">Toggle Suits</button>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={showMatchupScore} onChange={(e) => setShowMatchupScore(e.target.checked)} className="rounded border-slate-600 bg-slate-900/80" />
                  <span className="text-slate-300 text-sm">Show scores</span>
                </label>
                {showMatchupScore && (
                  <>
                    <div className="flex items-center gap-2">
                      <label className="text-slate-500 text-sm w-24">P1 Score</label>
                      <input type="number" min={0} value={matchupPlayer1Score} onChange={(e) => setMatchupPlayer1Score(Math.max(0, parseInt(e.target.value, 10) || 0))} className="w-20 px-2 py-1 text-sm bg-slate-900/80 border border-slate-600 rounded text-white" />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-slate-500 text-sm w-24">P2 Score</label>
                      <input type="number" min={0} value={matchupPlayer2Score} onChange={(e) => setMatchupPlayer2Score(Math.max(0, parseInt(e.target.value, 10) || 0))} className="w-20 px-2 py-1 text-sm bg-slate-900/80 border border-slate-600 rounded text-white" />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={showMatchupRace} onChange={(e) => setShowMatchupRace(e.target.checked)} className="rounded border-slate-600 bg-slate-900/80" />
                      <span className="text-slate-300 text-sm">Show races</span>
                    </label>
                    {showMatchupRace && (
                      <>
                        <div className="flex items-center gap-2">
                          <label className="text-slate-500 text-sm w-24">P1 Race</label>
                          <input type="number" min={1} max={999} value={matchupPlayer1Race} onChange={(e) => { const v = e.target.value; if (v === "") setMatchupPlayer1Race("1"); else { const n = parseInt(v, 10); if (!Number.isNaN(n)) setMatchupPlayer1Race(String(Math.max(1, Math.min(999, n)))); } }} className="w-20 px-2 py-1 text-sm bg-slate-900/80 border border-slate-600 rounded text-white" />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-slate-500 text-sm w-24">P2 Race</label>
                          <input type="number" min={1} max={999} value={matchupPlayer2Race} onChange={(e) => { const v = e.target.value; if (v === "") setMatchupPlayer2Race("1"); else { const n = parseInt(v, 10); if (!Number.isNaN(n)) setMatchupPlayer2Race(String(Math.max(1, Math.min(999, n)))); } }} className="w-20 px-2 py-1 text-sm bg-slate-900/80 border border-slate-600 rounded text-white" />
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Paths */}
      <div className="rounded-lg border border-slate-600/60 bg-slate-800/40 overflow-hidden">
        <button
          type="button"
          onClick={() => setPathsExpanded((p) => !p)}
          className="flex w-full items-center gap-2 p-4 text-left text-sm font-semibold text-slate-300 hover:bg-slate-700/30 transition-colors"
        >
          {pathsExpanded ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
          Paths
        </button>
        {pathsExpanded && (
          <div className="space-y-3 px-4 pb-4">
            <div className="flex gap-2 items-center">
              <label className="text-slate-400 text-sm shrink-0 w-24">Marquee</label>
              <input type="text" readOnly value={marqueePath} placeholder="After update" className="flex-1 min-w-0 px-3 py-1.5 text-xs bg-slate-900/80 border border-slate-600 rounded text-slate-300" />
              <button type="button" onClick={() => copyPath(marqueePath)} disabled={!marqueePath} className="shrink-0 px-3 py-1.5 text-xs bg-slate-600 hover:bg-slate-500 text-white rounded disabled:opacity-50">Copy</button>
            </div>
            <div className="flex gap-2 items-center">
              <label className="text-slate-400 text-sm shrink-0 w-24">Matchup</label>
              <input type="text" readOnly value={matchupCardPath} placeholder="After update" className="flex-1 min-w-0 px-3 py-1.5 text-xs bg-slate-900/80 border border-slate-600 rounded text-slate-300" />
              <button type="button" onClick={() => copyPath(matchupCardPath)} disabled={!matchupCardPath} className="shrink-0 px-3 py-1.5 text-xs bg-slate-600 hover:bg-slate-500 text-white rounded disabled:opacity-50">Copy</button>
            </div>
            {lastMarqueeUploadAt && (
              <p className="text-slate-500 text-xs">Last upload: {new Date(lastMarqueeUploadAt).toLocaleString()}</p>
            )}
            <button
              type="button"
              onClick={() => {
                setRefreshMarqueeError(null);
                const reload = (window as unknown as { reloadBrowserSource?: (name: string) => Promise<void> }).reloadBrowserSource;
                if (typeof reload === "function") {
                  reload("Marquee").catch((err: Error) => setRefreshMarqueeError(err?.message ?? String(err)));
                } else {
                  setRefreshMarqueeError("OBS connection not loaded. Refresh the page.");
                }
              }}
              className="px-3 py-2 text-sm font-medium rounded-lg bg-slate-700/80 text-slate-200 hover:bg-slate-600/80"
            >
              Refresh Marquee in OBS
            </button>
            {refreshMarqueeError && (
              <div className="rounded-lg border border-red-500/60 bg-red-950/40 px-3 py-2 text-sm text-red-200 flex items-center justify-between gap-2">
                <span className="min-w-0">{refreshMarqueeError}</span>
                <button type="button" onClick={() => setRefreshMarqueeError(null)} className="shrink-0 px-2 py-0.5 hover:bg-red-900/50 rounded">Dismiss</button>
              </div>
            )}
          </div>
        )}
      </div>

        </>
      )}

      {hasEventLoaded && (
        <>
          {/* Font sizes */}
          <div className="rounded-lg border border-slate-600/60 bg-slate-800/40 p-4">
            <button type="button" onClick={() => setFontSizesExpanded((p) => !p)} className="flex items-center gap-2 w-full text-left text-sm font-medium text-slate-300 hover:text-white">
              {fontSizesExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              Font Sizes
            </button>
            {fontSizesExpanded && (
              <div className="mt-3 grid gap-2">
                <div className="flex items-center gap-2">
                  <label className="text-slate-400 text-sm w-36">Event name</label>
                  <input type="number" min={8} max={48} value={eventNameFontSize} onChange={(e) => setEventNameFontSize(Math.max(8, Math.min(48, parseInt(e.target.value, 10) || DEFAULT_EVENT_NAME_FONT_SIZE)))} className="w-16 px-2 py-1 text-xs bg-slate-900/80 border border-slate-600 rounded text-white" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-slate-400 text-sm w-36">Sub text</label>
                  <input type="number" min={8} max={48} value={subTextFontSize} onChange={(e) => setSubTextFontSize(Math.max(8, Math.min(48, parseInt(e.target.value, 10) || DEFAULT_SUB_TEXT_FONT_SIZE)))} className="w-16 px-2 py-1 text-xs bg-slate-900/80 border border-slate-600 rounded text-white" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-slate-400 text-sm w-36">Player name</label>
                  <input type="number" min={8} max={48} value={playerNameFontSize} onChange={(e) => setPlayerNameFontSize(Math.max(8, Math.min(48, parseInt(e.target.value, 10) || DEFAULT_PLAYER_NAME_FONT_SIZE)))} className="w-16 px-2 py-1 text-xs bg-slate-900/80 border border-slate-600 rounded text-white" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-slate-400 text-sm w-36">Marquee</label>
                  <input type="number" min={8} max={48} value={marqueeFontSize} onChange={(e) => setMarqueeFontSize(Math.max(8, Math.min(48, parseInt(e.target.value, 10) || DEFAULT_MARQUEE_FONT_SIZE)))} className="w-16 px-2 py-1 text-xs bg-slate-900/80 border border-slate-600 rounded text-white" />
                </div>
              </div>
            )}
          </div>

          {/* Marquee */}
          <div className="rounded-lg border border-slate-600/60 bg-slate-800/40 p-4">
            <button type="button" onClick={() => setMarqueeExpanded((p) => !p)} className="flex items-center gap-2 w-full text-left text-sm font-medium text-slate-300 hover:text-white">
              {marqueeExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              Marquee
            </button>
            {marqueeExpanded && (
              <>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={marqueeEnabled} onChange={(e) => setMarqueeEnabled(e.target.checked)} className="rounded border-slate-600 bg-slate-900/80 text-slate-500" />
                    <span className="text-slate-300 text-sm">Display marquee banner</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="text-slate-400 text-sm">Speed</label>
                    <input type="number" min={1} max={100} value={marqueeSpeed} onChange={(e) => setMarqueeSpeed(Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 50)))} className="w-14 px-2 py-1 text-xs bg-slate-900/80 border border-slate-600 rounded text-white" />
                  </div>
                </div>
                <div className="mt-4 rounded-lg border border-slate-600/60 bg-slate-900/40 p-3 min-h-0 overflow-visible">
                  <h4 className="text-xs font-semibold text-slate-400 mb-2">Marquee Preview</h4>
                  <div className="min-h-0 overflow-visible">
                    <MarqueeBanner />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Player list */}
          <div className="rounded-lg border border-slate-600/60 bg-slate-800/40 p-4">
            <button type="button" onClick={() => setPlayerListExpanded((p) => !p)} className="flex items-center gap-2 w-full text-left text-sm font-medium text-slate-300 hover:text-white">
              {playerListExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              Player List {playerCount > 0 && `(${playerCount})`}
            </button>
            {playerListExpanded && (
              <div className="mt-3 space-y-3">
                <div className="flex items-center gap-2">
                  <label className="text-slate-400 text-sm">Number of players</label>
                  <input type="number" min={0} max={128} value={playerCount} onChange={(e) => setPlayerCount(Math.max(0, parseInt(e.target.value, 10) || 0))} className="w-14 px-2 py-1 text-xs bg-slate-900/80 border border-slate-600 rounded text-white" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {playerNames.map((name, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-slate-500 text-sm w-6 shrink-0">{index + 1}.</span>
                      <input type="text" value={name} onChange={(e) => handlePlayerNameChange(index, e.target.value)} placeholder={`Player ${index + 1}`} className="flex-1 min-w-0 px-3 py-1.5 text-sm bg-slate-900/80 border border-slate-600 rounded text-white placeholder-slate-500" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Standings */}
          <div className="rounded-lg border border-slate-600/60 bg-slate-800/40 p-4">
            <button type="button" onClick={() => setStandingsExpanded((p) => !p)} className="flex items-center gap-2 w-full text-left text-sm font-medium text-slate-300 hover:text-white">
              {standingsExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              Final Standings
            </button>
            {standingsExpanded && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Array.from({ length: playerCount }, (_, i) => i + 1).map((position) => {
                  const availablePlayers = getAvailablePlayersForPosition(position);
                  const selectedPlayerIndex = standings[position];
                  return (
                    <div key={position} className="flex items-center gap-2">
                      <span className="text-slate-500 text-sm w-8 shrink-0">{position}{positionSuffix(position)}.</span>
                      <select value={selectedPlayerIndex ?? -1} onChange={(e) => handleStandingChange(position, parseInt(e.target.value, 10))} className="flex-1 min-w-0 px-3 py-1.5 text-sm bg-slate-900/80 border border-slate-600 rounded text-white">
                        <option value={-1}>— Select —</option>
                        {availablePlayers.map(({ index, name }) => (
                          <option key={index} value={index}>{name}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </>
      )}

        </div>
      )}

      {showNameTakenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" aria-modal="true" role="dialog">
          <div className="bg-slate-800 border border-slate-600 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Event name already in use</h3>
            <p className="text-slate-300 text-sm mb-6">Choose a unique name or load the existing event from the dropdown.</p>
            <button type="button" onClick={() => setShowNameTakenModal(false)} className="px-4 py-2 text-sm font-medium bg-slate-600 hover:bg-slate-500 text-white rounded-lg">OK</button>
          </div>
        </div>
      )}

      {showCopyNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-slate-800 border border-slate-600 rounded-xl px-6 py-4 shadow-xl text-slate-200 text-sm">Path copied to clipboard</div>
        </div>
      )}
    </section>
  );
}
