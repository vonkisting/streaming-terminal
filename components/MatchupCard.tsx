"use client";

import { useMarquee } from "./TournamentMarqueeContext";

function CueBallIcon({ className }: { className?: string }) {
  return (
    <span className={`inline-flex flex-shrink-0 ${className ?? ""}`} aria-hidden>
      <svg
        viewBox="0 0 24 24"
        className="w-6 h-6 sm:w-7 sm:h-7 drop-shadow-md"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="cueball-shine" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="40%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="11" fill="url(#cueball-shine)" stroke="#cbd5e1" strokeWidth="0.5" />
      </svg>
    </span>
  );
}

const PANEL_CLASS =
  "border border-slate-400/70 text-white font-sans shadow-md " +
  "bg-gradient-to-b from-teal-900/95 via-teal-800/90 to-slate-800/95 " +
  "bg-[length_100%_200%]";

const TOP_BOTTOM_PANEL_CLASS =
  "text-white font-sans shadow-md bg-gradient-to-r from-black/50 via-amber-700/90 to-black/50";

export default function MatchupCard() {
  const { marquee } = useMarquee();
  const whoseTurn = marquee.matchupWhoseTurn ?? 1;
  const suitsSwapped = marquee.suitsImagesSwapped ?? false;
  const firstBallSrc = suitsSwapped ? "/pool-ball-15.png" : "/pool-ball-1.png";
  const firstBallAlt = suitsSwapped ? "15 ball" : "1 ball";
  const secondBallSrc = suitsSwapped ? "/pool-ball-1.png" : "/pool-ball-15.png";
  const secondBallAlt = suitsSwapped ? "1 ball" : "15 ball";

  if (!marquee.eventName.trim()) return null;

  const eventLabel = marquee.eventName.trim() || "";
  const eventNameSize = marquee.eventNameFontSize ?? 12;
  const subTextSize = marquee.subTextFontSize ?? 12;
  const playerNameSize = marquee.playerNameFontSize ?? 18;
  const topSectionHeight = Math.max(28, eventNameSize + 16);
  const bottomSectionHeight = Math.max(28, subTextSize + 16);
  const middleSectionMinHeight = Math.max(36, playerNameSize + 20);
  const player1Name =
    marquee.currentMatchupPlayer1 >= 0
      ? marquee.playerNames[marquee.currentMatchupPlayer1] || `Player ${marquee.currentMatchupPlayer1 + 1}`
      : "";
  const player2Name =
    marquee.currentMatchupPlayer2 >= 0
      ? marquee.playerNames[marquee.currentMatchupPlayer2] || `Player ${marquee.currentMatchupPlayer2 + 1}`
      : "";

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-0.5 px-4 py-2 flex-shrink-0">
      {/* Top section – event name, trapezoidal */}
      <div
        className={`${TOP_BOTTOM_PANEL_CLASS} w-[92%] max-w-[420px] flex items-center justify-center`}
        style={{
          clipPath: "polygon(8% 0, 92% 0, 100% 100%, 0 100%)",
          minHeight: `${topSectionHeight}px`,
        }}
      >
        <span
          className="font-semibold tracking-widest uppercase text-white/95"
          style={{ fontSize: `${eventNameSize}px` }}
        >
          {eventLabel || "\u00A0"}
        </span>
      </div>

      {/* Middle section – players and scores */}
      <div className="relative w-full">
        {whoseTurn === 1 && (
          <div className="absolute right-full top-1/2 -translate-y-1/2 flex items-center mr-1 sm:mr-2 pointer-events-none">
            <CueBallIcon />
          </div>
        )}
        {whoseTurn === 2 && (
          <div className="absolute left-full top-1/2 -translate-y-1/2 flex items-center ml-1 sm:ml-2 pointer-events-none">
            <CueBallIcon />
          </div>
        )}
        <div
          className={`${PANEL_CLASS} w-full rounded-l-full rounded-r-full py-2 px-2 sm:px-3 flex items-stretch justify-between gap-0`}
          style={{ minHeight: `${middleSectionMinHeight}px` }}
        >
          <div className="flex items-stretch gap-2 min-w-0 flex-1 justify-start rounded-l-full bg-gradient-to-b from-red-950 via-red-900/95 to-black -my-2 -ml-2 sm:-ml-3 pl-2 sm:pl-3">
            {marquee.showMatchupRace && marquee.showMatchupScore && (
            <div className="flex-shrink-0 flex self-stretch -ml-2 sm:-ml-3 mr-0">
              <span className="w-10 sm:w-12 h-full flex items-center justify-center bg-white border-2 border-slate-400/70 rounded-l-full text-black text-lg sm:text-2xl font-bold tracking-wider text-center leading-normal px-0.5 overflow-hidden">
                {marquee.matchupPlayer1Race}
              </span>
            </div>
            )}
            {marquee.showMatchupScore && (
              <>
                <div className="flex-shrink-0 flex items-center justify-center px-0.5">
                  <span className="text-lg sm:text-xl font-bold tabular-nums text-white leading-normal">
                    {marquee.matchupPlayer1Score}
                  </span>
                </div>
                <div className="w-px self-stretch min-h-[20px] bg-white/50 flex-shrink-0" aria-hidden />
              </>
            )}
            <div className="flex-1 min-w-0 flex items-center justify-center relative">
              <img
                src={firstBallSrc}
                alt={firstBallAlt}
                className={`absolute left-0 bottom-full mb-3 w-12 h-12 sm:w-14 sm:h-14 object-contain pointer-events-none ${suitsSwapped ? "scale-[1.15]" : "scale-[1.2]"}`}
                aria-hidden
              />
              <span
                className="font-semibold uppercase truncate text-white/95 text-center leading-normal"
                style={{ fontSize: `${playerNameSize}px` }}
              >
                {player1Name || "—"}
              </span>
            </div>
          </div>

          <div className="flex-shrink-0 flex self-stretch -my-2">
            <span className="text-lg sm:text-2xl font-bold text-black tracking-wider bg-white border-2 border-slate-400/70 px-2 min-h-full flex items-center justify-center">
              VS
            </span>
          </div>

          <div className="flex items-stretch gap-2 min-w-0 flex-1 justify-end rounded-r-full bg-gradient-to-b from-blue-950 via-blue-900/95 to-black -my-2 -mr-2 sm:-mr-3 pr-2 sm:pr-3">
            <div className="flex-1 min-w-0 flex items-center justify-center relative">
              <img
                src={secondBallSrc}
                alt={secondBallAlt}
                className={`absolute right-0 bottom-full mb-3 w-12 h-12 sm:w-14 sm:h-14 object-contain pointer-events-none ${suitsSwapped ? "scale-[1.2]" : "scale-[1.15]"}`}
                aria-hidden
              />
              <span
                className="font-semibold uppercase truncate text-white/95 text-center leading-normal"
                style={{ fontSize: `${playerNameSize}px` }}
              >
                {player2Name || "—"}
              </span>
            </div>
            {marquee.showMatchupScore && (
              <>
                <div className="w-px self-stretch min-h-[20px] bg-white/50 flex-shrink-0" aria-hidden />
                <div className="flex-shrink-0 flex items-center justify-center px-0.5">
                  <span className="text-lg sm:text-xl font-bold tabular-nums text-white leading-normal">
                    {marquee.matchupPlayer2Score}
                  </span>
                </div>
              </>
            )}
            {marquee.showMatchupRace && marquee.showMatchupScore && (
              <div className="flex-shrink-0 flex self-stretch -mr-2 sm:-mr-3 ml-0">
                <span className="w-10 sm:w-12 h-full flex items-center justify-center bg-white border-2 border-slate-400/70 rounded-r-full text-black text-lg sm:text-2xl font-bold tracking-wider text-center leading-normal px-0.5 overflow-hidden">
                  {marquee.matchupPlayer2Race}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom section – round, trapezoidal */}
      <div
        className={`${TOP_BOTTOM_PANEL_CLASS} w-[92%] max-w-[420px] flex items-center justify-center`}
        style={{
          clipPath: "polygon(0 0, 100% 0, 92% 100%, 8% 100%)",
          minHeight: `${bottomSectionHeight}px`,
        }}
      >
        <span
          className="font-semibold tracking-widest uppercase text-white/95"
          style={{ fontSize: `${subTextSize}px` }}
        >
          {marquee.matchupRound || "\u00A0"}
        </span>
      </div>
    </div>
  );
}
