"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useMarquee } from "./TournamentMarqueeContext";

const STORAGE_KEY = "streaming-terminal-tournaments";

const ROUND_OPTIONS = ["Championship Match", "Hot Seat Match", "Losers Side", "Winners Side"];

const DEFAULT_EVENT_NAME_FONT_SIZE = 12; // matches CSS card top section (text-xs)
const DEFAULT_SUB_TEXT_FONT_SIZE = 12;   // matches CSS card bottom section (text-xs)
const DEFAULT_PLAYER_NAME_FONT_SIZE = 18; // matches CSS card middle section (text-lg)
const DEFAULT_MARQUEE_FONT_SIZE = 18;    // matches marquee banner text (text-[1.09375rem] ≈ 17.5px, use 18)

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

export default function TournamentDashboard() {
  const { setMarquee, streamUrl, setStreamUrl, setStreamPlaying } = useMarquee();
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
  const [currentMatchupExpanded, setCurrentMatchupExpanded] = useState(true);
  const [pathsExpanded, setPathsExpanded] = useState(false);
  const [refreshMarqueeError, setRefreshMarqueeError] = useState<string | null>(null);
  const [showNameTakenModal, setShowNameTakenModal] = useState(false);
  const [marqueePath, setMarqueePath] = useState("");
  const [matchupCardPath, setMatchupCardPath] = useState("");
  const [lastMarqueeUploadAt, setLastMarqueeUploadAt] = useState<string | null>(null);
  const [showCopyNotification, setShowCopyNotification] = useState(false);
  const copyNotificationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [matchupPushStatus, setMatchupPushStatus] = useState<"idle" | "pushed" | "obs_disconnected" | "obs_failed" | "api_error">("idle");
  const [matchupPushError, setMatchupPushError] = useState<string | null>(null);
  const matchupPushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [turnFontSize, setTurnFontSize] = useState(14);
  const turnToggleRef = useRef<HTMLDivElement>(null);
  const turnMeasureRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    setSavedEvents(getStoredData());
  }, []);

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
    setStreamUrl("");
  }, [setStreamUrl]);

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
    setStreamUrl(data.streamUrl ?? "");
  }, [savedEvents, setStreamUrl]);

  const collapseEventSections = useCallback(() => {
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
    collapseEventSections();
  };

  const handleSelectSavedEvent = (name: string) => {
    setEventName(name);
    loadEvent(name);
    setLoadedEventKey(name);
    setDropdownOpen(false);
    collapseEventSections();
  };

  const handleEventNameChange = (value: string) => {
    setEventName(value);
    const trimmed = value.trim();
    if (trimmed && savedEvents[trimmed]) {
      loadEvent(trimmed);
      setLoadedEventKey(trimmed);
      collapseEventSections();
    } else {
      setLoadedEventKey(null);
      if (!trimmed || !savedEvents[trimmed]) {
        clearToDefaults(value);
      }
      collapseEventSections();
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
    streamUrl: streamUrl ?? "",
  }), [
    eventName, playerCount, playerNames, marqueeEnabled, marqueeSpeed, standings,
    showMatchupScore, showMatchupRace, currentMatchupPlayer1, currentMatchupPlayer2,
    matchupPlayer1Score, matchupPlayer2Score, matchupPlayer1Race, matchupPlayer2Race,     matchupRound, matchupWhoseTurn, matchupSuit, suitsImagesSwapped,
    eventNameFontSize, subTextFontSize, playerNameFontSize, marqueeFontSize, streamUrl,
  ]);

  const handleCreate = () => {
    const name = eventName.trim();
    if (!name) {
      setSaveMessage("Enter an event name");
      return;
    }
    if (savedEvents[name]) {
      setShowNameTakenModal(true);
      return;
    }
    const data = buildEventData();
    data.eventName = name;
    const next = { ...getStoredData(), [name]: data };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSavedEvents(next);
    setLoadedEventKey(name);
    setSaveMessage("");
  };

  // Auto-save when any input (except event name) changes and an event is loaded
  useEffect(() => {
    if (!loadedEventKey || !savedEvents[loadedEventKey]) return;
    const data = buildEventData();
    data.eventName = loadedEventKey;
    const next = { ...getStoredData(), [loadedEventKey]: data };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSavedEvents((prev) => ({ ...prev, [loadedEventKey]: data }));
  }, [
    loadedEventKey,
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
    streamUrl,
  ]);

  useEffect(() => {
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
    setMarquee(marqueePayload);
    fetch("/api/overlay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marquee: marqueePayload }),
    })
      .then((r) => r.json())
      .then((data) => {
        const pathToShow = data?.marqueeUrl ?? data?.savedPath ?? "";
        if (pathToShow) setMarqueePath(pathToShow);
        if (data?.matchupCardUrl) setMatchupCardPath(data.matchupCardUrl);
        if (data?.githubUploadedAt) setLastMarqueeUploadAt(data.githubUploadedAt);
      })
      .catch(() => {});
  }, [
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
    setMarquee,
  ]);

  // Push matchup card HTML directly to OBS when player names, round, turn, or suits change (no GitHub upload).
  useEffect(() => {
    const payload = {
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
    fetch("/api/overlay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marquee: payload, matchupCardOnly: true }),
    })
      .then((r) => r.json())
      .then((data) => {
        const html = data?.matchupCardHtml;
        const reload = (window as unknown as { reloadBrowserSource?: (name: string) => Promise<void> }).reloadBrowserSource;
        if (typeof html !== "string") {
          console.warn("[Matchup] API did not return matchupCardHtml");
          setMatchupPushStatus("api_error");
          setMatchupPushError(null);
        } else if (typeof reload !== "function") {
          console.warn("[Matchup] reloadBrowserSource not available (OBS script not loaded?)");
          setMatchupPushStatus("obs_disconnected");
          setMatchupPushError(null);
        } else {
          reload("Matchup Card")
            .then(() => {
              console.log("[Matchup] OBS confirmed matchup card refresh");
              setMatchupPushStatus("pushed");
              setMatchupPushError(null);
            })
            .catch((err: Error) => {
              console.warn("[Matchup] OBS reload failed:", err?.message ?? err);
              setMatchupPushStatus("obs_failed");
              setMatchupPushError(err?.message ?? String(err));
            });
        }
        if (matchupPushTimeoutRef.current) clearTimeout(matchupPushTimeoutRef.current);
        matchupPushTimeoutRef.current = setTimeout(() => {
          setMatchupPushStatus("idle");
          setMatchupPushError(null);
        }, 4000);
      })
      .catch((err) => {
        console.warn("[Matchup] API error:", err);
        setMatchupPushStatus("api_error");
        setMatchupPushError(null);
        if (matchupPushTimeoutRef.current) clearTimeout(matchupPushTimeoutRef.current);
        matchupPushTimeoutRef.current = setTimeout(() => setMatchupPushStatus("idle"), 4000);
      });
  }, [
    currentMatchupPlayer1,
    currentMatchupPlayer2,
    matchupRound,
    matchupWhoseTurn,
    suitsImagesSwapped,
    eventName,
    standings,
    playerNames,
    marqueeEnabled,
    marqueeSpeed,
    showMatchupScore,
    showMatchupRace,
    matchupPlayer1Score,
    matchupPlayer2Score,
    matchupPlayer1Race,
    matchupPlayer2Race,
    matchupSuit,
    eventNameFontSize,
    subTextFontSize,
    playerNameFontSize,
    marqueeFontSize,
  ]);

  useEffect(() => {
    const count = Math.max(0, Math.min(128, playerCount));
    setPlayerNames((prev) => {
      const next = [...prev];
      if (next.length < count) {
        return [...next, ...Array(count - next.length).fill("")];
      }
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
      if (playerIndex === -1) {
        delete next[position];
      } else {
        next[position] = playerIndex;
      }
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

  return (
    <div className="w-full min-w-0 max-w-full p-2 space-y-2">
      {/* Paths card */}
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
        <label className="block text-sm font-medium text-slate-300 mt-3 mb-2">Marquee Path</label>
        <div className="flex gap-2 min-w-0">
          <input
            type="text"
            readOnly
            value={marqueePath}
            placeholder="Path appears after marquee is updated"
            className="flex-1 min-w-0 px-4 py-1.5 text-xs bg-slate-900/80 border border-slate-600/50 rounded-lg text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={() => {
              if (marqueePath) {
                navigator.clipboard.writeText(marqueePath).then(() => {
                  if (copyNotificationTimeoutRef.current) clearTimeout(copyNotificationTimeoutRef.current);
                  setShowCopyNotification(true);
                  copyNotificationTimeoutRef.current = setTimeout(() => {
                    setShowCopyNotification(false);
                    copyNotificationTimeoutRef.current = null;
                  }, 3000);
                });
              }
            }}
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
            placeholder="Path appears after overlay is updated"
            className="flex-1 min-w-0 px-4 py-1.5 text-xs bg-slate-900/80 border border-slate-600/50 rounded-lg text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={() => {
              if (matchupCardPath) {
                navigator.clipboard.writeText(matchupCardPath).then(() => {
                  if (copyNotificationTimeoutRef.current) clearTimeout(copyNotificationTimeoutRef.current);
                  setShowCopyNotification(true);
                  copyNotificationTimeoutRef.current = setTimeout(() => {
                    setShowCopyNotification(false);
                    copyNotificationTimeoutRef.current = null;
                  }, 3000);
                });
              }
            }}
            disabled={!matchupCardPath}
            className="shrink-0 w-16 min-w-[4rem] px-4 py-1.5 text-xs font-medium bg-slate-600 hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            Copy
          </button>
        </div>
        {lastMarqueeUploadAt && (
          <p className="text-slate-500 text-xs mt-1.5">
            Last upload:{" "}
            {(() => {
              const d = new Date(lastMarqueeUploadAt);
              const ms = String(d.getMilliseconds()).padStart(3, "0");
              return `${d.toLocaleDateString()} ${d.toLocaleTimeString(undefined, { hour12: true, hour: "2-digit", minute: "2-digit", second: "2-digit" })}.${ms}`;
            })()}
          </p>
        )}
        </>
        )}
      </div>
      {hasEventLoaded && (
      <>
      {/* Current Matchup */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6 shadow-lg min-w-0">
        <button
          type="button"
          onClick={() => setCurrentMatchupExpanded((prev) => !prev)}
          className="flex items-center gap-2 w-full text-left text-sm font-medium text-slate-300 mb-3 hover:text-white transition-colors"
        >
          {currentMatchupExpanded ? (
            <ChevronDown className="w-4 h-4 shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 shrink-0" />
          )}
          Current Matchup
        </button>
        {currentMatchupExpanded && (
        <div className="flex flex-col gap-3 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <label className="text-slate-500 text-sm shrink-0 w-16">Player 1</label>
            <select
              value={currentMatchupPlayer1}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                setCurrentMatchupPlayer1(v);
                if (v === currentMatchupPlayer2) setCurrentMatchupPlayer2(-1);
              }}
              className="flex-1 min-w-0 px-4 py-1.5 bg-slate-900/80 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            >
              <option value={-1}>— Select player —</option>
              {playerOptionsSorted.map(({ index, displayName }) => (
                index !== currentMatchupPlayer2 && (
                  <option key={index} value={index}>
                    {displayName}
                  </option>
                )
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <label className="text-slate-500 text-sm shrink-0 w-16">Player 2</label>
            <select
              value={currentMatchupPlayer2}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                setCurrentMatchupPlayer2(v);
                if (v === currentMatchupPlayer1) setCurrentMatchupPlayer1(-1);
              }}
              className="flex-1 min-w-0 px-4 py-1.5 bg-slate-900/80 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            >
              <option value={-1}>— Select player —</option>
              {playerOptionsSorted.map(({ index, displayName }) => (
                index !== currentMatchupPlayer1 && (
                  <option key={index} value={index}>
                    {displayName}
                  </option>
                )
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <label className="text-slate-500 text-sm shrink-0 w-16">Round</label>
            <select
              value={matchupRound}
              onChange={(e) => setMatchupRound(e.target.value)}
              className="flex-1 min-w-0 px-4 py-1.5 bg-slate-900/80 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            >
              <option value="">— Select round —</option>
              {ROUND_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <label className="text-slate-500 text-sm shrink-0 w-16">Turn</label>
            <div
              ref={turnToggleRef}
              className="flex min-w-0 flex-1 max-w-sm rounded-lg overflow-hidden border border-slate-600/50 bg-slate-900/80 relative"
              role="group"
              aria-label="Whose turn"
            >
              <span
                ref={turnMeasureRef}
                className="absolute -left-[9999px] top-0 whitespace-nowrap font-bold pointer-events-none"
                aria-hidden
              >
                {turnLongerName}
              </span>
              <button
                type="button"
                onClick={() => setMatchupWhoseTurn(1)}
                style={{ fontSize: `${turnFontSize}px` }}
                className={`flex-1 min-w-0 flex items-center justify-center py-2 px-2 font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-inset overflow-hidden text-ellipsis whitespace-nowrap ${
                  matchupWhoseTurn === 1 ? "bg-red-700/90 text-white" : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                }`}
                aria-pressed={matchupWhoseTurn === 1}
                title={turnName1}
              >
                {turnName1}
              </button>
              <button
                type="button"
                onClick={() => setMatchupWhoseTurn(2)}
                style={{ fontSize: `${turnFontSize}px` }}
                className={`flex-1 min-w-0 flex items-center justify-center py-2 px-2 font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-inset overflow-hidden text-ellipsis whitespace-nowrap ${
                  matchupWhoseTurn === 2 ? "bg-blue-700/90 text-white" : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                }`}
                aria-pressed={matchupWhoseTurn === 2}
                title={turnName2}
              >
                {turnName2}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <label className="text-slate-500 text-sm shrink-0 w-16">Suit</label>
            <div
              className="flex min-w-0 flex-1 max-w-sm rounded-lg overflow-hidden border border-slate-600/50 bg-slate-900/80"
              role="group"
              aria-label="Suit"
            >
              <button
                type="button"
                onClick={() => setMatchupSuit(1)}
                className="flex-1 min-w-0 flex items-center justify-center py-2 px-2 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-inset"
                aria-pressed={matchupSuit === 1}
                title={suitsImagesSwapped ? "15 ball" : "1 ball"}
              >
                <img
                  src={suitsImagesSwapped ? "/pool-ball-15.png" : "/pool-ball-1.png"}
                  alt={suitsImagesSwapped ? "15 ball" : "1 ball"}
                  className={`w-8 h-8 sm:w-9 sm:h-9 shrink-0 object-contain ${!suitsImagesSwapped ? "scale-[1.15]" : ""}`}
                />
              </button>
              <div className="w-px self-stretch min-h-[32px] bg-slate-600/70 shrink-0" aria-hidden />
              <button
                type="button"
                onClick={() => setMatchupSuit(2)}
                className="flex-1 min-w-0 flex items-center justify-center py-2 px-2 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-inset overflow-visible"
                aria-pressed={matchupSuit === 2}
                title={suitsImagesSwapped ? "1 ball" : "15 ball"}
              >
                <img
                  src={suitsImagesSwapped ? "/pool-ball-1.png" : "/pool-ball-15.png"}
                  alt={suitsImagesSwapped ? "1 ball" : "15 ball"}
                  className={`w-8 h-8 sm:w-9 sm:h-9 shrink-0 object-contain ${suitsImagesSwapped ? "scale-[1.15]" : ""}`}
                />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 min-w-0 mt-1">
            <div className="w-16 shrink-0" aria-hidden />
            <button
              type="button"
              onClick={() => setSuitsImagesSwapped((s) => !s)}
              className="flex-1 min-w-0 max-w-sm px-3 py-2 text-sm font-medium rounded-lg bg-slate-700/80 text-slate-200 hover:bg-slate-600/80 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-colors"
            >
              Toggle Suits
            </button>
          </div>
          {matchupPushStatus !== "idle" && (
            <div className="flex items-center gap-2 min-w-0 mt-1">
              <div className="w-16 shrink-0" aria-hidden />
              <p
                className={`text-xs font-medium px-2 py-1 rounded ${
                  matchupPushStatus === "pushed"
                    ? "text-emerald-300 bg-emerald-950/60"
                    : matchupPushStatus === "obs_disconnected"
                      ? "text-amber-300 bg-amber-950/60"
                      : "text-red-300 bg-red-950/60"
                }`}
                role="status"
              >
                {matchupPushStatus === "pushed"
                  ? "Matchup card updated in OBS"
                  : matchupPushStatus === "obs_disconnected"
                    ? "OBS not connected — matchup not pushed"
                    : matchupPushStatus === "obs_failed"
                      ? (matchupPushError || "OBS rejected or did not respond")
                      : "Matchup update failed (check console)"}
              </p>
            </div>
          )}
          <div className="flex items-center gap-2 min-w-0 mt-1">
            <div className="w-16 shrink-0" aria-hidden />
            <button
              type="button"
              onClick={() => {
                setRefreshMarqueeError(null);
                const reload = (window as unknown as { reloadBrowserSource?: (name: string) => Promise<void> }).reloadBrowserSource;
                if (typeof reload === "function") {
                  reload("Marquee").catch((err: Error) => {
                    setRefreshMarqueeError(err?.message ?? String(err));
                  });
                } else {
                  setRefreshMarqueeError("OBS connection not loaded. Refresh the page.");
                }
              }}
              className="flex-1 min-w-0 max-w-sm px-3 py-2 text-sm font-medium rounded-lg bg-slate-700/80 text-slate-200 hover:bg-slate-600/80 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-colors"
            >
              Refresh Marquee
            </button>
          </div>
          {refreshMarqueeError && (
            <div className="mt-2 flex flex-wrap items-start gap-2 rounded-lg border border-red-500/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
              <span className="flex-1 min-w-0">{refreshMarqueeError}</span>
              <span className="flex shrink-0 gap-1.5">
                {refreshMarqueeError.includes("not connected") || refreshMarqueeError.includes("still connecting") ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof (window as unknown as { connectOBS?: () => void }).connectOBS === "function") {
                        (window as unknown as { connectOBS: () => void }).connectOBS();
                        setRefreshMarqueeError(null);
                      }
                    }}
                    className="rounded px-2 py-0.5 font-medium hover:bg-red-900/50 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    Retry connection
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setRefreshMarqueeError(null)}
                  className="rounded px-2 py-0.5 font-medium hover:bg-red-900/50 focus:outline-none focus:ring-2 focus:ring-red-500"
                  aria-label="Dismiss"
                >
                  Dismiss
                </button>
              </span>
            </div>
          )}
          <label className="flex items-center gap-2 cursor-pointer group mt-1">
            <input
              type="checkbox"
              checked={showMatchupScore}
              onChange={(e) => setShowMatchupScore(e.target.checked)}
              className="w-3 h-3 rounded border-slate-600 bg-slate-900/80 text-slate-500 focus:ring-slate-500 focus:ring-offset-0"
            />
            <span className="text-slate-300 text-sm font-medium group-hover:text-white transition-colors">
              Show Scores
            </span>
          </label>
          {showMatchupScore && (
            <>
              <div className="flex items-center gap-2 min-w-0">
                <label className="text-slate-500 text-sm shrink-0 w-24 whitespace-nowrap">Player 1 Score</label>
                <input
                  type="number"
                  min={0}
                  value={matchupPlayer1Score}
                  onChange={(e) => setMatchupPlayer1Score(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-20 px-3 py-1.5 bg-slate-900/80 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <label className="text-slate-500 text-sm shrink-0 w-24 whitespace-nowrap">Player 2 Score</label>
                <input
                  type="number"
                  min={0}
                  value={matchupPlayer2Score}
                  onChange={(e) => setMatchupPlayer2Score(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-20 px-3 py-1.5 bg-slate-900/80 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={showMatchupRace}
                  onChange={(e) => setShowMatchupRace(e.target.checked)}
                  className="w-3 h-3 rounded border-slate-600 bg-slate-900/80 text-slate-500 focus:ring-slate-500 focus:ring-offset-0"
                />
                <span className="text-slate-300 text-sm font-medium group-hover:text-white transition-colors">
                  Show Races
                </span>
              </label>
              <div className="flex items-center gap-2 min-w-0">
                <label className="text-slate-500 text-sm shrink-0 w-24 whitespace-nowrap">Player 1 Race</label>
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={matchupPlayer1Race}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "") setMatchupPlayer1Race("1");
                    else {
                      const n = parseInt(v, 10);
                      if (!Number.isNaN(n)) setMatchupPlayer1Race(String(Math.max(1, Math.min(999, n))));
                    }
                  }}
                  className="w-20 px-3 py-1.5 bg-slate-900/80 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <label className="text-slate-500 text-sm shrink-0 w-24 whitespace-nowrap">Player 2 Race</label>
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={matchupPlayer2Race}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "") setMatchupPlayer2Race("1");
                    else {
                      const n = parseInt(v, 10);
                      if (!Number.isNaN(n)) setMatchupPlayer2Race(String(Math.max(1, Math.min(999, n))));
                    }
                  }}
                  className="w-20 px-3 py-1.5 bg-slate-900/80 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                />
              </div>
            </>
          )}
        </div>
        )}
      </div>
      </>
      )}

      {/* Event Name */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6 shadow-lg min-w-0 min-h-[150px]">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-slate-300">Event</label>
          {loadedEventKey === null && (
            <button
              type="button"
              onClick={handleCreate}
              className="shrink-0 px-4 py-1.5 text-xs font-medium bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
            >
              Create
            </button>
          )}
        </div>
        <div className="min-w-0 relative">
          <input
              type="text"
              value={eventName}
              onChange={(e) => handleEventNameChange(e.target.value)}
              onFocus={() => setDropdownOpen(true)}
              onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
              placeholder="Event name or select from saved"
              className="w-full min-w-0 px-4 py-1.5 pr-8 text-xs bg-slate-900/80 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => setDropdownOpen((o) => !o)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
              tabIndex={-1}
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            {dropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                <button
                  type="button"
                  className="w-full text-left px-4 py-2 text-slate-200 hover:bg-slate-700 text-sm border-b border-slate-600/50"
                  onMouseDown={() => handleSelectNone()}
                >
                  &lt; None &gt;
                </button>
                {Object.keys(savedEvents).map((name) => (
                  <button
                    key={name}
                    type="button"
                    className="w-full text-left px-4 py-2 text-slate-200 hover:bg-slate-700 text-sm"
                    onMouseDown={() => handleSelectSavedEvent(name)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
        </div>
        {hasEventLoaded && (
          <>
            <div className="border-t border-slate-600/50 my-4" aria-hidden />
            <button
              type="button"
              onClick={() => setFontSizesExpanded((prev) => !prev)}
              className="flex items-center gap-2 w-full text-left text-sm font-medium text-slate-300 mb-3 hover:text-white transition-colors"
            >
              {fontSizesExpanded ? (
                <ChevronDown className="w-4 h-4 shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 shrink-0" />
              )}
              Font Sizes
            </button>
            {fontSizesExpanded && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-400 shrink-0 w-[11rem]">Event Name Font Size</label>
              <input
                type="number"
                min={8}
                max={48}
                value={eventNameFontSize}
                onChange={(e) => setEventNameFontSize(Math.max(8, Math.min(48, parseInt(e.target.value, 10) || DEFAULT_EVENT_NAME_FONT_SIZE)))}
                className="max-w-[75px] w-full min-w-0 px-3 py-1.5 text-xs bg-slate-900/80 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-400 shrink-0 w-[11rem]">Sub Text Font Size</label>
              <input
                type="number"
                min={8}
                max={48}
                value={subTextFontSize}
                onChange={(e) => setSubTextFontSize(Math.max(8, Math.min(48, parseInt(e.target.value, 10) || DEFAULT_SUB_TEXT_FONT_SIZE)))}
                className="max-w-[75px] w-full min-w-0 px-3 py-1.5 text-xs bg-slate-900/80 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-400 shrink-0 w-[11rem]">Player Name Font Size</label>
              <input
                type="number"
                min={8}
                max={48}
                value={playerNameFontSize}
                onChange={(e) => setPlayerNameFontSize(Math.max(8, Math.min(48, parseInt(e.target.value, 10) || DEFAULT_PLAYER_NAME_FONT_SIZE)))}
                className="max-w-[75px] w-full min-w-0 px-3 py-1.5 text-xs bg-slate-900/80 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-400 shrink-0 w-[11rem]">Marquee Font Size</label>
              <input
                type="number"
                min={8}
                max={48}
                value={marqueeFontSize}
                onChange={(e) => setMarqueeFontSize(Math.max(8, Math.min(48, parseInt(e.target.value, 10) || DEFAULT_MARQUEE_FONT_SIZE)))}
                className="max-w-[75px] w-full min-w-0 px-3 py-1.5 text-xs bg-slate-900/80 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              />
            </div>
          </div>
            )}
            <div className="border-t border-slate-600/50 my-4" aria-hidden />
            <button
              type="button"
              onClick={() => setMarqueeExpanded((prev) => !prev)}
              className="flex items-center gap-2 w-full text-left text-sm font-medium text-slate-300 mb-3 hover:text-white transition-colors"
            >
              {marqueeExpanded ? (
                <ChevronDown className="w-4 h-4 shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 shrink-0" />
              )}
              Marquee
            </button>
            {marqueeExpanded && (
            <div className="flex flex-wrap items-center gap-3 min-w-0 mb-4">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={marqueeEnabled}
                  onChange={(e) => setMarqueeEnabled(e.target.checked)}
                  className="w-3 h-3 rounded border-slate-600 bg-slate-900/80 text-slate-500 focus:ring-slate-500 focus:ring-offset-0"
                />
                <span className="text-slate-300 font-medium group-hover:text-white transition-colors">
                  Display Marquee Banner
                </span>
              </label>
              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-400">Speed</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={marqueeSpeed}
                  onChange={(e) => setMarqueeSpeed(Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 50)))}
                  className="min-w-[75px] w-12 px-2 py-1 text-xs bg-slate-900/80 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                />
              </div>
            </div>
            )}
          </>
        )}
        {hasEventLoaded && (
          <>
            <div className="border-t border-slate-600/50 my-4" aria-hidden />
            <button
              type="button"
              onClick={() => setPlayerListExpanded((prev) => !prev)}
              className="flex items-center gap-2 w-full text-left text-sm font-medium text-slate-300 mb-3 hover:text-white transition-colors"
            >
              {playerListExpanded ? (
                <ChevronDown className="w-4 h-4 shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 shrink-0" />
              )}
              Player List {playerCount > 0 && `(${playerCount})`}
            </button>
            {playerListExpanded && (
            <>
            <div className="mb-4 min-w-0 flex items-center gap-2 flex-wrap">
              <label className="text-sm font-medium text-slate-300">Number of Players</label>
              <input
                type="number"
                min={0}
                max={128}
                value={playerCount}
                onChange={(e) => setPlayerCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="min-w-[55px] w-12 px-2 py-1 text-xs bg-slate-900/80 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-colors"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
              {playerNames.map((name, index) => (
                <div key={index} className="flex items-center gap-2 min-w-0">
                  <span className="text-slate-500 text-sm w-6 shrink-0 flex-shrink-0">{index + 1}.</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handlePlayerNameChange(index, e.target.value)}
                    placeholder={`Player ${index + 1}`}
                    className="flex-1 min-w-0 px-4 py-1.5 bg-slate-900/80 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-colors"
                  />
                </div>
              ))}
            </div>
            </>
            )}
            <div className="border-t border-slate-600/50 my-4" aria-hidden />
            <button
              type="button"
              onClick={() => setStandingsExpanded((prev) => !prev)}
              className="flex items-center gap-2 w-full text-left text-sm font-medium text-slate-300 mb-3 hover:text-white transition-colors"
            >
              {standingsExpanded ? (
                <ChevronDown className="w-4 h-4 shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 shrink-0" />
              )}
              Final Standings {playerCount > 0 && `(${playerCount})`}
            </button>
            {standingsExpanded && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
              {Array.from({ length: playerCount }, (_, i) => i + 1).map((position) => {
                const availablePlayers = getAvailablePlayersForPosition(position);
                const selectedPlayerIndex = standings[position];
                return (
                  <div key={position} className="flex items-center gap-2 min-w-0">
                    <span className="text-slate-500 text-sm w-8 shrink-0 flex-shrink-0">
                      {position}{positionSuffix(position)}.
                    </span>
                    <select
                      value={selectedPlayerIndex ?? -1}
                      onChange={(e) => handleStandingChange(position, parseInt(e.target.value, 10))}
                      className="flex-1 min-w-0 px-4 py-1.5 bg-slate-900/80 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    >
                      <option value={-1}>— Select player —</option>
                      {availablePlayers.map(({ index, name }) => (
                        <option key={index} value={index}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
            )}
            <div className="border-t border-slate-600/50 my-4" aria-hidden />
          </>
        )}
        {saveMessage && (
          <p className="mt-2 text-sm text-slate-400">{saveMessage}</p>
        )}
        {showNameTakenModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" aria-modal="true" role="dialog">
            <div className="bg-slate-800 border border-slate-600 rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Event name already in use</h3>
              <p className="text-slate-300 text-sm mb-6">
                Please choose a unique name for your event. You can load the existing event with this name from the dropdown above.
              </p>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowNameTakenModal(false)}
                  className="px-4 py-2 text-sm font-medium bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Copy notification modal */}
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
