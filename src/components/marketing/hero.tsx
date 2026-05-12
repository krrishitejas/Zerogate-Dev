"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Github } from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────
   HERO — minimal, plain-language pitch.
   Headline answers "what does ZEROGATE do?" in 3 seconds.
   ──────────────────────────────────────────────────────────────────────── */

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0 grid-bg-fine opacity-30" aria-hidden />
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[900px] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(ellipse, hsl(var(--amber) / 0.28) 0%, transparent 65%)" }}
        aria-hidden
      />

      <div className="container relative grid items-center gap-16 pt-24 pb-28 lg:grid-cols-12 lg:gap-12 lg:pt-32 lg:pb-36">
        {/* LEFT — copy */}
        <div className="lg:col-span-7">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-3"
          >
            <span className="meta meta-dot text-amber-phosphor">ZEROGATE / v1.0</span>
            <span className="rule-h flex-1 max-w-[180px]" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="mt-10 font-display text-balance text-[48px] sm:text-[60px] lg:text-[72px] leading-[1.02] tracking-tight text-cream"
          >
            Find security bugs in your code.{" "}
            <span className="italic text-amber-phosphor">Get a fix in a pull request.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18 }}
            className="mt-8 max-w-xl font-reading text-[18px] leading-[1.55] text-cream-dim"
          >
            Connect a GitHub repo. Twelve specialised AI agents scan every file and open a PR with the patch — automatically.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.28 }}
            className="mt-10 flex flex-wrap items-center gap-3"
          >
            <Link href="/signup" className="btn-amber">
              <Github className="h-3.5 w-3.5" /> Connect GitHub <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link href="/pricing" className="btn-outline">
              See pricing
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-5 font-mono text-[11px] uppercase tracking-[0.2em] text-cream-faint"
          >
            ▸ free forever · no credit card
          </motion.p>
        </div>

        {/* RIGHT — minimal terminal preview */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="lg:col-span-5"
        >
          <TerminalPreview />
        </motion.div>
      </div>
    </section>
  );
}

/* ─────────────────────────── TERMINAL PREVIEW ──────────────────────────── */

function TerminalPreview() {
  const lines: { p: string; t: string; tone?: "amber" | "moss" | "crit" | "dim" }[] = [
    { p: "$", t: "zerogate scan acme/payments", tone: "amber" },
    { p: "▸", t: "indexed 1,284 files · 17.4k LOC", tone: "dim" },
    { p: "▸", t: "running 12 agents in parallel…", tone: "dim" },
    { p: "✗", t: "src/api/orders.ts:42 — SQL injection", tone: "crit" },
    { p: "✗", t: ".env.example:3 — AWS key leaked", tone: "crit" },
    { p: "✗", t: "package.json:14 — lodash@4.17.15 vuln", tone: "crit" },
    { p: "▸", t: "patch synthesised · 3 fixes ready", tone: "amber" },
    { p: "✓", t: "PR #42 opened on zerogate/fix-001", tone: "moss" }
  ];

  return (
    <div className="terminal-window relative">
      <div className="corner-tick tl" />
      <div className="corner-tick tr" />
      <div className="corner-tick bl" />
      <div className="corner-tick br" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-rule px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-phosphor animate-blink" />
          <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-amber-phosphor">
            zerogate · cli
          </span>
        </div>
        <span className="font-mono text-[10px] tracking-[0.2em] text-cream-faint">
          ~ / acme-payments
        </span>
      </div>

      {/* Body */}
      <div className="px-5 py-5 font-mono text-[12.5px] leading-[1.85] space-y-1">
        {lines.map((l, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.5 + i * 0.12 }}
            className="flex items-start gap-2.5"
          >
            <span
              className={
                l.p === "$" ? "text-amber-phosphor" :
                l.p === "✓" ? "text-moss" :
                l.p === "✗" ? "text-crit" :
                "text-cream-faint"
              }
            >
              {l.p}
            </span>
            <span
              className={
                l.tone === "moss" ? "text-moss" :
                l.tone === "crit" ? "text-crit" :
                l.tone === "amber" ? "text-cream" :
                "text-cream-dim"
              }
            >
              {l.t}
            </span>
          </motion.div>
        ))}
        <div className="flex items-center gap-2 pt-1">
          <span className="text-amber-phosphor">$</span>
          <span className="ml-0.5 inline-block h-3 w-1.5 bg-amber-phosphor animate-blink" />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-rule px-4 py-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-cream-faint">
        <span>▸ scan complete</span>
        <span className="text-moss">PR ready</span>
      </div>
    </div>
  );
}
