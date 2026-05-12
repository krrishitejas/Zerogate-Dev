"use client";
import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { Menu, X, Github } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/#workflow", label: "How it works" },
  { href: "/#agents",   label: "Agents" },
  { href: "/pricing",   label: "Pricing" }
];

export function MarketingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-rule bg-ink/85 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Logo />

        <nav className="hidden md:flex items-center gap-1 font-mono text-[12px] uppercase tracking-[0.2em]">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="group relative px-4 py-2 text-cream-dim transition-colors hover:text-amber-phosphor"
            >
              {l.label}
              <span className="absolute inset-x-3 bottom-1 h-px scale-x-0 origin-left bg-amber-phosphor transition-transform duration-300 group-hover:scale-x-100" />
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/signin"
            className="hidden sm:inline-flex font-mono text-[11px] uppercase tracking-[0.22em] text-cream-dim hover:text-amber-phosphor transition px-3 py-2"
          >
            Sign in
          </Link>
          <Link href="/signup" className="btn-amber text-[11px]">
            <Github className="h-3.5 w-3.5" /> Connect GitHub
          </Link>
          <button
            onClick={() => setOpen((v) => !v)}
            className="md:hidden inline-flex h-9 w-9 items-center justify-center border border-rule text-cream hover:text-amber-phosphor hover:border-amber-phosphor/50"
            aria-label="Toggle menu"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className={cn("md:hidden border-t border-rule overflow-hidden transition-[max-height] duration-300", open ? "max-h-96" : "max-h-0")}>
        <div className="container flex flex-col py-3 font-mono text-[12px] uppercase tracking-[0.18em]">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="flex items-center justify-between border-b border-rule/60 py-3 text-cream-dim hover:text-amber-phosphor"
            >
              <span>{l.label}</span>
              <span className="text-amber-phosphor">→</span>
            </Link>
          ))}
          <Link
            href="/signin"
            onClick={() => setOpen(false)}
            className="py-3 text-cream-dim hover:text-amber-phosphor"
          >
            Sign in
          </Link>
        </div>
      </div>
    </header>
  );
}
