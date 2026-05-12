"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Minus } from "lucide-react";
import { PLAN_LIMITS, PLAN_PRICING, formatInr, type Plan } from "@/lib/plans";

/* ──────────────────────────────────────────────────────────────────────────
   PRICING — clean comparison table.
   ──────────────────────────────────────────────────────────────────────── */

const ORDER: Plan[] = ["FREE", "PRO", "MAX"];

const PLAN_COPY: Record<Plan, string> = {
  FREE: "For developers exploring the platform.",
  PRO:  "For teams shipping to production.",
  MAX:  "For organisations that need full coverage."
};

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return String(n);
}

type Row =
  | { label: string; values: (string | number)[]; type: "text" }
  | { label: string; values: boolean[]; type: "bool" };

export function Pricing({ inline = false }: { inline?: boolean }) {
  const rows: Row[] = [
    {
      label: "Projects",
      type: "text",
      values: ORDER.map((p) =>
        PLAN_LIMITS[p].maxProjects >= 999 ? "Unlimited" : String(PLAN_LIMITS[p].maxProjects)
      )
    },
    {
      label: "Files per project",
      type: "text",
      values: ORDER.map((p) => fmt(PLAN_LIMITS[p].maxFilesPerProject))
    },
    {
      label: "Scans / month",
      type: "text",
      values: ORDER.map((p) => fmt(PLAN_LIMITS[p].maxScansPerMonth))
    },
    {
      label: "Specialised agents",
      type: "text",
      values: ORDER.map((p) => `${PLAN_LIMITS[p].agents.length} of 12`)
    },
    {
      label: "Auto-fix & regenerate",
      type: "bool",
      values: ORDER.map((p) => PLAN_LIMITS[p].agents.includes("Fix Synthesizer"))
    },
    {
      label: "Real-time watch",
      type: "bool",
      values: ORDER.map((p) => PLAN_LIMITS[p].realtimeWatch)
    },
    {
      label: "Push fixes to GitHub",
      type: "bool",
      values: ORDER.map((p) => PLAN_LIMITS[p].pushToGithub)
    },
    {
      label: "Support",
      type: "text",
      values: ORDER.map((p) => cap(PLAN_LIMITS[p].supportLevel))
    }
  ];

  return (
    <section id="pricing" className={inline ? "py-12" : "relative py-24 lg:py-32"}>
      <div className="container">
        {/* Header */}
        <div className="max-w-3xl">
          <div className="flex items-center gap-3">
            <span className="meta meta-dot text-amber-phosphor">Pricing</span>
            <span className="rule-h flex-1 max-w-[120px]" />
          </div>
          <h2 className="mt-8 font-display text-balance text-[40px] sm:text-[52px] lg:text-[64px] leading-[1.05] tracking-tight text-cream">
            Start free.{" "}
            <span className="italic text-amber-phosphor">Scale when you ship.</span>
          </h2>
        </div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.55 }}
          className="mt-16 overflow-hidden border border-rule"
        >
          {/* Plan headers */}
          <div className="grid grid-cols-4 bg-ink-2 border-b border-rule">
            <div className="hidden sm:block px-6 py-7" />
            {ORDER.map((p) => (
              <div
                key={p}
                className={`px-5 py-7 sm:border-l border-rule ${p === "PRO" ? "bg-ink-3 relative" : ""}`}
              >
                {p === "PRO" && (
                  <span className="absolute top-3 right-3 text-[11px] text-amber-phosphor">
                    Recommended
                  </span>
                )}
                <div className="font-display text-[28px] italic leading-none text-cream">
                  {p.toLowerCase()}.
                </div>
                <p className="mt-2 font-reading text-[13.5px] leading-[1.5] text-cream-dim text-pretty">
                  {PLAN_COPY[p]}
                </p>
                <div className="mt-6 flex items-baseline gap-1.5">
                  <span className="font-display text-[40px] leading-none text-cream">
                    {formatInr(PLAN_PRICING[p].monthlyInr)}
                  </span>
                  <span className="text-[12px] text-cream-faint">/mo</span>
                </div>
                {PLAN_PRICING[p].annualInr > 0 && (
                  <div className="mt-1 text-[11.5px] text-cream-faint">
                    {formatInr(PLAN_PRICING[p].annualInr)} / year
                  </div>
                )}
                <Link
                  href={p === "FREE" ? "/signup" : `/signup?plan=${p}`}
                  className={`mt-6 flex w-full justify-center ${p === "PRO" ? "btn-amber" : "btn-outline"}`}
                >
                  {PLAN_PRICING[p].cta} →
                </Link>
              </div>
            ))}
          </div>

          {/* Rows */}
          <div className="divide-y divide-rule">
            {rows.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-4 items-center"
              >
                <div className="px-6 py-4 col-span-1 hidden sm:block">
                  <span className="text-[13px] text-cream-dim">{row.label}</span>
                </div>
                {row.values.map((v, i) => (
                  <div
                    key={i}
                    className={`px-5 py-4 sm:border-l border-rule ${ORDER[i] === "PRO" ? "bg-ink-3" : ""}`}
                  >
                    <div className="sm:hidden mb-1.5 text-[12px] text-cream-faint">
                      {row.label}
                    </div>
                    {row.type === "bool" ? (
                      v ? (
                        <Check className="h-4 w-4 text-amber-phosphor" strokeWidth={2} />
                      ) : (
                        <Minus className="h-4 w-4 text-cream-faint" strokeWidth={1.5} />
                      )
                    ) : (
                      <span className="text-[13.5px] text-cream">{String(v)}</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
