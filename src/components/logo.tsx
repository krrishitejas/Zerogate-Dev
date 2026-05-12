import { cn } from "@/lib/utils";
import Link from "next/link";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-3", className)}>
      {/* Monogram: a rotated brutalist Z inside a phosphor reticle */}
      <span className="relative inline-flex h-9 w-9 items-center justify-center">
        <svg viewBox="0 0 40 40" className="h-9 w-9" fill="none" aria-hidden>
          {/* Outer corner ticks */}
          <path d="M2 2 H10 M2 2 V10" stroke="hsl(var(--amber))" strokeWidth="1.25" />
          <path d="M38 2 H30 M38 2 V10" stroke="hsl(var(--amber))" strokeWidth="1.25" />
          <path d="M2 38 H10 M2 38 V30" stroke="hsl(var(--amber))" strokeWidth="1.25" />
          <path d="M38 38 H30 M38 38 V30" stroke="hsl(var(--amber))" strokeWidth="1.25" />
          {/* Crosshair */}
          <line x1="20" y1="6" x2="20" y2="13" stroke="hsl(var(--cream-faint))" strokeWidth="0.75" />
          <line x1="20" y1="27" x2="20" y2="34" stroke="hsl(var(--cream-faint))" strokeWidth="0.75" />
          <line x1="6" y1="20" x2="13" y2="20" stroke="hsl(var(--cream-faint))" strokeWidth="0.75" />
          <line x1="27" y1="20" x2="34" y2="20" stroke="hsl(var(--cream-faint))" strokeWidth="0.75" />
          {/* Z */}
          <path
            d="M11 13 H29 L11 27 H29"
            stroke="hsl(var(--amber))"
            strokeWidth="2"
            strokeLinecap="square"
            strokeLinejoin="miter"
            className="transition-all duration-300 group-hover:[filter:drop-shadow(0_0_6px_hsl(var(--amber)))]"
          />
          {/* Centre dot */}
          <circle cx="20" cy="20" r="1.2" fill="hsl(var(--amber))" />
        </svg>
        <span className="absolute inset-0 -z-10 rounded-sm bg-amber-phosphor/0 blur-md transition group-hover:bg-amber-phosphor/25" />
      </span>
      <span className="leading-none">
        <span className="block font-mono text-[10px] uppercase tracking-[0.32em] text-cream-faint">
          ZGT // 0xR1
        </span>
        <span className="mt-0.5 block font-mono text-[15px] font-semibold tracking-[0.22em] text-cream">
          ZERO<span className="text-amber-phosphor">GATE</span>
        </span>
      </span>
    </Link>
  );
}
