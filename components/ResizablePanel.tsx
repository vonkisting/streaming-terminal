"use client";

import { useState, useRef, useEffect, useCallback } from "react";

const HANDLE_WIDTH = 8;

interface ResizablePanelProps {
  children: React.ReactNode;
  defaultWidth: number;
  minWidth?: number;
  maxWidth?: number;
  storageKey?: string;
  className?: string;
}

function getStoredWidth(key: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 0) return null;
    return n;
  } catch {
    return null;
  }
}

/**
 * A panel that is sticky left and resizable by dragging its right edge.
 * Width is optional persisted via storageKey.
 */
export default function ResizablePanel({
  children,
  defaultWidth,
  minWidth = 120,
  maxWidth = 10000,
  storageKey,
  className = "",
}: ResizablePanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>(() => {
    if (storageKey) {
      const stored = getStoredWidth(storageKey);
      if (stored != null) return Math.max(minWidth, Math.min(maxWidth, stored));
    }
    return Math.max(minWidth, Math.min(maxWidth, defaultWidth));
  });
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const currentWidthRef = useRef(width);
  currentWidthRef.current = width;

  const clampWidth = useCallback(
    (w: number) => Math.max(minWidth, Math.min(maxWidth, w)),
    [minWidth, maxWidth]
  );

  useEffect(() => {
    if (!isDragging) return;
    const onMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startXRef.current;
      const next = clampWidth(startWidthRef.current + delta);
      currentWidthRef.current = next;
      setWidth(next);
    };
    const onMouseUp = () => {
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, String(currentWidthRef.current));
        } catch {
          // ignore
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
  }, [isDragging, clampWidth, storageKey]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    startXRef.current = e.clientX;
    startWidthRef.current = width;
    setIsDragging(true);
  };

  return (
    <div ref={containerRef} className={`flex shrink-0 self-stretch min-h-0 ${className}`} style={{ width }}>
      <div className="flex-1 min-w-0 min-h-0 overflow-hidden flex flex-col">
        {children}
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panel"
        onMouseDown={handleMouseDown}
        className="shrink-0 flex items-stretch cursor-col-resize hover:bg-slate-600/30 active:bg-slate-500/40 transition-colors"
        style={{ width: HANDLE_WIDTH }}
      />
    </div>
  );
}
