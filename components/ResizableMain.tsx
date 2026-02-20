"use client";

import { useState, useRef, useCallback, useEffect, Children } from "react";

const MIN_WIDTH = 240;
const MAX_WIDTH_PERCENT = 0.7;
const DEFAULT_WIDTH_PERCENT = 0.4;
const HANDLE_WIDTH = 8;
const STORAGE_KEY = "streaming-terminal-sidenav-width";

function getStoredWidth(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n < MIN_WIDTH) return null;
    return n;
  } catch {
    return null;
  }
}

interface ResizableMainProps {
  children: [React.ReactNode, React.ReactNode];
}

export default function ResizableMain({ children }: ResizableMainProps) {
  const [sidenavContent, mainContent] = Children.toArray(children);
  const containerRef = useRef<HTMLDivElement>(null);
  const [sidenavWidth, setSidenavWidth] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const currentWidthRef = useRef(0);

  const initWidth = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const totalWidth = el.getBoundingClientRect().width;
    const maxWidth = totalWidth * MAX_WIDTH_PERCENT;
    const defaultWidth = totalWidth * DEFAULT_WIDTH_PERCENT;
    const stored = getStoredWidth();
    const initial = stored != null ? Math.max(MIN_WIDTH, Math.min(maxWidth, stored)) : Math.round(defaultWidth);
    setSidenavWidth(initial);
  }, []);

  useEffect(() => {
    initWidth();
  }, [initWidth]);

  useEffect(() => {
    if (!isDragging) return;
    const onMouseMove = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const totalWidth = el.getBoundingClientRect().width;
      const maxWidth = totalWidth * MAX_WIDTH_PERCENT;
      const delta = e.clientX - startXRef.current;
      const next = Math.max(MIN_WIDTH, Math.min(maxWidth, startWidthRef.current + delta));
      currentWidthRef.current = next;
      setSidenavWidth(next);
    };
    const onMouseUp = () => {
      const w = currentWidthRef.current;
      if (w > 0) {
        try {
          localStorage.setItem(STORAGE_KEY, String(w));
        } catch {
          // ignore storage errors
        }
      }
      setIsDragging(false);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    startXRef.current = e.clientX;
    startWidthRef.current = sidenavWidth ?? MIN_WIDTH;
    setIsDragging(true);
  };

  const width = sidenavWidth ?? 0;

  return (
    <div ref={containerRef} className="flex flex-1 overflow-hidden w-full min-h-0">
      <aside
        className="shrink-0 min-h-full overflow-y-auto overflow-x-hidden bg-transparent"
        style={{ width: width > 0 ? width : "40%" }}
      >
        {sidenavContent}
      </aside>
      <div
        role="separator"
        aria-orientation="vertical"
        onMouseDown={handleMouseDown}
        className="shrink-0 flex items-stretch cursor-col-resize hover:bg-slate-600/40 active:bg-slate-500/50 transition-colors group"
        style={{ width: HANDLE_WIDTH }}
      >
        <div className="w-px bg-slate-600/60 group-hover:bg-slate-500/80 mx-auto" />
      </div>
      <div className="flex-1 min-w-0 min-h-0 flex flex-col h-full overflow-hidden">
        {mainContent}
      </div>
    </div>
  );
}
