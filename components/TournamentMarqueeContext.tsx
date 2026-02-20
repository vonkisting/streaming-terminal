"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface MarqueeData {
  eventName: string;
  standings: Record<number, number>;
  playerNames: string[];
  marqueeEnabled: boolean;
  marqueeSpeed: number;
  currentMatchupPlayer1: number;
  currentMatchupPlayer2: number;
  showMatchupScore: boolean;
  showMatchupRace: boolean;
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
}

const MarqueeContext = createContext<{
  marquee: MarqueeData;
  setMarquee: (data: Partial<MarqueeData>) => void;
  streamUrl: string;
  setStreamUrl: (url: string) => void;
  streamPlaying: boolean;
  setStreamPlaying: (playing: boolean) => void;
} | null>(null);

export function TournamentMarqueeProvider({ children }: { children: ReactNode }) {
  const [streamUrl, setStreamUrl] = useState("");
  const [streamPlaying, setStreamPlaying] = useState(false);
  const [marquee, setMarqueeState] = useState<MarqueeData>({
    eventName: "",
    standings: {},
    playerNames: [],
    marqueeEnabled: false,
    marqueeSpeed: 50,
    currentMatchupPlayer1: -1,
    currentMatchupPlayer2: -1,
    showMatchupScore: false,
    showMatchupRace: false,
    matchupPlayer1Score: 0,
    matchupPlayer2Score: 0,
    matchupPlayer1Race: "1",
    matchupPlayer2Race: "1",
    matchupRound: "",
    matchupWhoseTurn: 1,
    matchupSuit: 1,
    suitsImagesSwapped: false,
    eventNameFontSize: 12,
    subTextFontSize: 12,
    playerNameFontSize: 18,
    marqueeFontSize: 18,
  });

  const setMarquee = useCallback((data: Partial<MarqueeData>) => {
    setMarqueeState((prev) => ({ ...prev, ...data }));
  }, []);

  return (
    <MarqueeContext.Provider value={{ marquee, setMarquee, streamUrl, setStreamUrl, streamPlaying, setStreamPlaying }}>
      {children}
    </MarqueeContext.Provider>
  );
}

export function useMarquee() {
  const ctx = useContext(MarqueeContext);
  if (!ctx) throw new Error("useMarquee must be used within TournamentMarqueeProvider");
  return ctx;
}
