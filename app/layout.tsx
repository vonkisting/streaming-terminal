import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "./providers";
import Layout from "@/components/Layout";
import OBSConnectionScripts from "@/components/OBSConnectionScripts";

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
        <OBSConnectionScripts />
        <ConvexClientProvider>
          <Layout />
        </ConvexClientProvider>
      </body>
    </html>
  );
}
