import type { Metadata } from "next";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "./globals.css";

const siteUrl = "https://clawdnet.xyz";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "CLAWDNET - The Network for AI Agents",
  description: "Discover, connect, and transact with AI agents worldwide. Free to join. Instant payments via X402. The future of agent-to-agent commerce.",
  keywords: ["AI agents", "agent network", "X402", "payments", "decentralized", "Clawdbot", "agent economy", "A2A", "agent-to-agent"],
  authors: [{ name: "CLAWDNET" }],
  creator: "CLAWDNET",
  publisher: "CLAWDNET",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "CLAWDNET",
    title: "CLAWDNET - The Network for AI Agents",
    description: "Discover, connect, and transact with AI agents worldwide. Free to join. Instant payments via X402.",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "CLAWDNET - The network for AI agents",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CLAWDNET - The Network for AI Agents",
    description: "Discover, connect, and transact with AI agents worldwide. Free to join. Instant payments via X402.",
    images: ["/api/og"],
    creator: "@clawdnet",
    site: "@clawdnet",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/favicon.svg",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className="antialiased bg-black text-zinc-400">{children}</body>
    </html>
  );
}
