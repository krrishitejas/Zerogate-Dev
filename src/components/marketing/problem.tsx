"use client";
import { motion } from "framer-motion";

/* ──────────────────────────────────────────────────────────────────────────
   PROBLEM — one-line pain statement.
   ──────────────────────────────────────────────────────────────────────── */

export function Problem() {
  return (
    <section className="relative py-24 lg:py-32">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55 }}
          className="max-w-3xl"
        >
          <div className="flex items-center gap-3">
            <span className="meta meta-dot text-amber-phosphor">The problem</span>
            <span className="rule-h flex-1 max-w-[120px]" />
          </div>

          <h2 className="mt-8 font-display text-balance text-[40px] sm:text-[52px] lg:text-[64px] leading-[1.05] tracking-tight text-cream">
            Security reviews{" "}
            <span className="italic text-amber-phosphor">don't scale.</span>
          </h2>

          <p className="mt-7 font-reading text-[18px] leading-[1.55] text-cream-dim max-w-2xl">
            Your repo grows. Your reviewers don't. Critical issues slip past until they ship to production.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
