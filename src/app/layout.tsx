import type { Metadata, Viewport } from "next";
import dynamicImport from "next/dynamic";
import { Instrument_Serif, JetBrains_Mono, Newsreader } from "next/font/google";
import "./globals.css";

const Providers = dynamicImport(() => import("@/components/providers").then((m) => ({ default: m.Providers })), {
  ssr: false
});

export const dynamic = "force-dynamic";

const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap"
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap"
});

const reading = Newsreader({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--font-reading",
  display: "swap"
});

export const metadata: Metadata = {
  title: "ZEROGATE — Autonomous AI Code Security",
  description:
    "ZEROGATE is a multi-agent AI platform that scans, explains and remediates vulnerabilities in your software projects. Connect GitHub or upload a ZIP — your swarm of agents handles the rest.",
  keywords: ["code security", "SAST", "AI agents", "vulnerability scanner", "SQLi", "XSS", "DevSecOps"],
  authors: [{ name: "ZEROGATE" }],
  openGraph: {
    title: "ZEROGATE — Autonomous AI Code Security",
    description: "A swarm of specialised AI agents that hunt and fix vulnerabilities in your code.",
    type: "website"
  }
};

export const viewport: Viewport = {
  themeColor: "#0B0A08",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${display.variable} ${mono.variable} ${reading.variable}`}>
      <body className="min-h-screen antialiased font-mono bg-ink text-cream selection:bg-amber-phosphor/40 selection:text-cream">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
