"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Github } from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────
   CTA — single sentence, single button. Close the deal.
   ──────────────────────────────────────────────────────────────────────── */

export function CTA() {
  return (
    <section className="relative py-28 lg:py-36">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(700px 350px at 50% 50%, hsl(var(--amber) / 0.1), transparent 70%)"
        }}
        aria-hidden
      />

      <div className="container relative">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55 }}
          className="mx-auto max-w-3xl text-center"
        >
          <h2 className="font-display text-balance text-[44px] sm:text-[60px] lg:text-[72px] leading-[1.02] tracking-tight text-cream">
            Connect your repo.{" "}
            <span className="italic text-amber-phosphor">Get your first PR in minutes.</span>
          </h2>

          <div className="mt-10 flex justify-center">
            <Link href="/signup" className="btn-amber text-[13px]">
              <Github className="h-3.5 w-3.5" /> Connect GitHub <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.22em] text-cream-faint">
            ▸ free forever · no credit card
          </p>
        </motion.div>
      </div>
    </section>
  );
}
