"use client";
import { motion } from "framer-motion";
import { Github, Search, GitPullRequest, type LucideIcon } from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────
   HOW IT WORKS — 3 steps, no more. Connect → Scan → Fix.
   ──────────────────────────────────────────────────────────────────────── */

const STEPS: { icon: LucideIcon; n: string; title: string; body: string }[] = [
  {
    icon: Github,
    n: "01",
    title: "Connect",
    body: "Sign in with GitHub. Pick any repo."
  },
  {
    icon: Search,
    n: "02",
    title: "Scan",
    body: "Twelve agents read every file in parallel and surface real vulnerabilities."
  },
  {
    icon: GitPullRequest,
    n: "03",
    title: "Fix",
    body: "Get a pull request with the patch and a verified clean re-scan."
  }
];

export function Workflow() {
  return (
    <section id="workflow" className="relative py-24 lg:py-32">
      <div className="container">
        {/* Header */}
        <div className="max-w-3xl">
          <div className="flex items-center gap-3">
            <span className="meta meta-dot text-amber-phosphor">How it works</span>
            <span className="rule-h flex-1 max-w-[120px]" />
          </div>
          <h2 className="mt-8 font-display text-balance text-[40px] sm:text-[52px] lg:text-[64px] leading-[1.05] tracking-tight text-cream">
            Three steps from{" "}
            <span className="italic text-amber-phosphor">commit to PR.</span>
          </h2>
        </div>

        {/* Steps */}
        <div className="mt-16 grid gap-px bg-rule border border-rule sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <StepCard key={s.n} step={s} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StepCard({ step, index }: { step: typeof STEPS[number]; index: number }) {
  const Icon = step.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="group relative bg-ink-2 px-8 py-12 transition-colors hover:bg-ink-3"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-cream-faint">
          [{step.n}]
        </span>
        <div className="flex h-10 w-10 items-center justify-center border border-rule bg-ink group-hover:border-amber-phosphor/60 transition-colors">
          <Icon className="h-4 w-4 text-cream-dim group-hover:text-amber-phosphor transition-colors" strokeWidth={1.5} />
        </div>
      </div>

      <h3 className="mt-10 font-display text-[36px] italic leading-none text-cream group-hover:text-amber-phosphor transition-colors">
        {step.title}.
      </h3>

      <p className="mt-4 font-reading text-[15.5px] leading-[1.55] text-cream-dim text-pretty">
        {step.body}
      </p>
    </motion.div>
  );
}
