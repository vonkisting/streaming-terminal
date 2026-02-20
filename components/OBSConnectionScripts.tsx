"use client";

import Script from "next/script";

const DEFAULT_WS_URL = "ws://192.168.1.50:4455";

/** Injects OBS WebSocket config and loads obs-connection.js, then calls connectOBS(). */
export default function OBSConnectionScripts() {
  const url = process.env.NEXT_PUBLIC_OBS_WS_URL ?? DEFAULT_WS_URL;
  const password = process.env.NEXT_PUBLIC_OBS_WS_PASSWORD ?? "";

  const configScript = (
    <script
      dangerouslySetInnerHTML={{
        __html: `window.__OBS_WS_CONFIG__={url:${JSON.stringify(url)},password:${JSON.stringify(password)}};`,
      }}
    />
  );

  return (
    <>
      {configScript}
      <Script
        src="/obs-connection.js"
        strategy="afterInteractive"
        onLoad={() => {
          if (typeof window !== "undefined" && typeof (window as unknown as { connectOBS?: () => void }).connectOBS === "function") {
            (window as unknown as { connectOBS: () => void }).connectOBS();
          }
        }}
      />
    </>
  );
}
