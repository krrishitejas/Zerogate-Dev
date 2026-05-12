"use client";
import { motion } from "framer-motion";
import { useRef } from "react";
import { AGENTS, type AgentMeta } from "@/lib/agents/registry";
import { agentIcon } from "@/lib/agents/icons";

/* ──────────────────────────────────────────────────────────────────────────
   AGENTS · DOSSIER GRID — 3D tilt cards, asymmetric editorial header,
   cursor spotlight, corner ticks, codename line, capability bullet list,
   category chips, signal indicator. Lucide line icons (no emojis).
   ──────────────────────────────────────────────────────────────────────── */

export function AgentsGrid() {
  return (
    <section id="agents" className="relative py-24 lg:py-32 overflow-hidden">
      {/* Faint grid floor */}
      <div className="absolute inset-0 grid-bg-fine opacity-30" aria-hidden />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, hsl(var(--amber) / 0.6) 50%, transparent)" }}
      />

      <div className="container relative">
        {/* Editorial header — asymmetric */}
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-12 lg:items-end">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-3">
              <span className="meta meta-dot text-amber-phosphor">
                FILE · 002 / SWARM ROSTER
              </span>
              <span className="rule-h flex-1" />
            </div>
            <h2 className="mt-6 font-display text-balance text-[44px] sm:text-[60px] lg:text-[76px] leading-[0.95] tracking-tight text-cream">
              Twelve specialists.{" "}
              <span className="italic text-amber-phosphor">One coordinated</span>{" "}
              mission.
            </h2>
          </div>
          <div className="lg:col-span-5">
            <p className="font-reading text-[16.5px] leading-[1.6] text-cream-dim text-pretty">
              Every agent in the ZEROGATE roster is a single-purpose expert. The orchestrator
              activates them in phases, shares a RAG-indexed view of your project, and steps aside
              the moment you whisper{" "}
              <em className="italic text-amber-phosphor">regenerate</em>.
            </p>
            <div className="mt-6 grid grid-cols-3 border border-rule">
              {[
                { k: "TOTAL", v: AGENTS.length },
                { k: "FREE TIER", v: AGENTS.filter((a) => a.minPlan === "FREE").length },
                { k: "MAX TIER", v: AGENTS.filter((a) => a.minPlan === "MAX").length }
              ].map((s) => (
                <div key={s.k} className="px-3 py-3 border-r border-rule last:border-r-0">
                  <div className="meta">{s.k}</div>
                  <div className="font-display text-[28px] italic leading-none text-amber-phosphor mt-0.5">
                    {String(s.v).padStart(2, "0")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Dossier grid */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-rule border border-rule">
          {AGENTS.map((a, i) => (
            <AgentDossierCard key={a.id} agent={a} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────── DOSSIER CARD (3D tilt) ─────────────────────── */

function AgentDossierCard({ agent, index }: { agent: AgentMeta; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const Icon = agentIcon(agent.id);

  // Pure DOM tilt (no React state churn) — fastest path
  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--rx", `${(0.5 - py) * 6}deg`);
    el.style.setProperty("--ry", `${(px - 0.5) * 8}deg`);
    el.style.setProperty("--mx", `${px * 100}%`);
    el.style.setProperty("--my", `${py * 100}%`);
  };
  const handleLeave = () => {
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty("--rx", `0deg`);
    el.style.setProperty("--ry", `0deg`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: (index % 6) * 0.04 }}
      className="bg-ink"
    >
      <div
        ref={cardRef}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        className="group tilt-3d relative h-full bg-ink-2 p-6 transition-colors hover:bg-ink-3"
      >
        {/* Spotlight overlay (cursor-tracked) */}
        <div className="spotlight absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" aria-hidden />

        <div className="tilt-layer relative">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cream-faint">
              [{String(index + 1).padStart(2, "0")}]
            </span>
            <span className={`chip ${planChip(agent.minPlan)}`}>
              {agent.minPlan}
            </span>
          </div>

          {/* Sigil — Lucide line icon with reticle ring */}
          <div className="mt-5 flex items-center gap-4">
            <div className="relative flex h-14 w-14 items-center justify-center border border-rule bg-ink text-amber-phosphor">
              <Icon className="h-5 w-5" strokeWidth={1.5} />
              <span className="absolute -top-1 -left-1 h-2 w-2 border-l border-t border-amber-phosphor" />
              <span className="absolute -top-1 -right-1 h-2 w-2 border-r border-t border-amber-phosphor" />
              <span className="absolute -bottom-1 -left-1 h-2 w-2 border-l border-b border-amber-phosphor" />
              <span className="absolute -bottom-1 -right-1 h-2 w-2 border-r border-b border-amber-phosphor" />
            </div>
            <div>
              <div className="meta">{agent.role}</div>
              <h3 className="mt-1 font-display text-[24px] italic leading-tight text-cream group-hover:text-amber-phosphor transition-colors">
                {agent.name}
              </h3>
            </div>
          </div>

          {/* Codename */}
          <div className="mt-4 flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-cream-faint">
            <span>codename</span>
            <span className="text-cream-dim">{agent.id}</span>
          </div>

          <div className="rule-h my-4" />

          {/* One-line summary */}
          <p className="font-reading text-[14.5px] leading-[1.55] text-cream-dim text-pretty">
            {agent.summary}
          </p>

          {/* Capabilities */}
          <ul className="mt-5 space-y-1 font-mono text-[11px]">
            {agent.capabilities.slice(0, 4).map((c) => (
              <li key={c} className="flex items-start gap-2 text-cream-dim">
                <span className="text-amber-phosphor mt-0.5">▸</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>

          {/* Footer — categories + signal */}
          <div className="mt-6 pt-4 border-t border-rule flex items-center justify-between">
            <div className="flex flex-wrap gap-1.5">
              {(agent.categories ?? ["MISC"]).slice(0, 2).map((c) => (
                <span key={c} className="chip text-[9.5px]">
                  {c}
                </span>
              ))}
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-phosphor">
              <span className="opacity-70 group-hover:opacity-100 transition">signal</span>{" "}
              <span className="animate-blink">●</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function planChip(plan: AgentMeta["minPlan"]) {
  switch (plan) {
    case "FREE": return "chip-moss";
    case "PRO":  return "chip-amber";
    case "MAX":  return "chip-crit";
  }
}
