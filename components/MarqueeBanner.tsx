"use client";

import { useMarquee } from "./TournamentMarqueeContext";

function positionSuffix(n: number) {
  if (n % 10 === 1 && n !== 11) return "st";
  if (n % 10 === 2 && n !== 12) return "nd";
  if (n % 10 === 3 && n !== 13) return "rd";
  return "th";
}

export default function MarqueeBanner() {
  const { marquee } = useMarquee();

  if (!marquee.marqueeEnabled) return null;

  const positionLabel = (pos: number) => {
    if (pos === 1) return "Champion";
    if (pos === 2) return "Runner-Up";
    return `${pos}${positionSuffix(pos)}`;
  };

  const ordered = Object.entries(marquee.standings)
    .filter(([, idx]) => idx !== undefined)
    .sort(([a], [b]) => Number(b) - Number(a))
    .map(([pos, playerIndex]) => {
      const name = marquee.playerNames[Number(playerIndex)] || `Player ${Number(playerIndex) + 1}`;
      return `${positionLabel(Number(pos))} - ${name}`;
    });

  if (ordered.length === 0) return null;

  const fontSize = marquee.marqueeFontSize ?? 18;
  const baseClass = "inline-block text-slate-200 font-medium shrink-0";
  const verticalPadding = Math.max(8, Math.round(fontSize * 0.4));

  const MarqueeContent = () => (
    <>
      {marquee.eventName && (
        <>
          <span className={baseClass} style={{ fontSize: `${fontSize}px` }}>{marquee.eventName} - </span>
          <span className="inline-block shrink-0" style={{ width: 100 }} aria-hidden />
        </>
      )}
      {ordered.map((item, i) => (
        <span key={i}>
          <span className={baseClass} style={{ fontSize: `${fontSize}px` }}>{item}</span>
          {i < ordered.length - 1 && (
            <span className="inline-block shrink-0" style={{ width: 75 }} aria-hidden />
          )}
        </span>
      ))}
    </>
  );

  const speed = Math.max(1, Math.min(100, marquee.marqueeSpeed ?? 50));
  const duration = Math.max(3, 65 - speed * 0.6);

  return (
    <div className="w-full overflow-hidden border-b border-slate-700/50 bg-gradient-to-b from-blue-950 via-blue-900 to-blue-950">
      <div
        className="inline-flex items-center whitespace-nowrap animate-marquee px-4"
        style={{ animationDuration: `${duration}s`, paddingTop: `${verticalPadding}px`, paddingBottom: `${verticalPadding}px` }}
      >
        <MarqueeContent />
        <span className="inline-block shrink-0" style={{ width: 300 }} aria-hidden />
        <MarqueeContent />
        <span className="inline-block shrink-0" style={{ width: 300 }} aria-hidden />
      </div>
    </div>
  );
}
