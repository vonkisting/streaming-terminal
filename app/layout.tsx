import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "./providers";
import OBSConnectionScripts from "@/components/OBSConnectionScripts";
import { TournamentMarqueeProvider } from "@/components/TournamentMarqueeContext";
import { OBS_CONNECTION_ENABLED } from "@/lib/featureFlags";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Streaming Terminal",
  description: "Streaming Terminal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {OBS_CONNECTION_ENABLED && <OBSConnectionScripts />}
        <ConvexClientProvider>
          <TournamentMarqueeProvider>
            {children}
          </TournamentMarqueeProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
