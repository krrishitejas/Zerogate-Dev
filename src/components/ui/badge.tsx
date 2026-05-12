import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  children,
  className,
  variant = "default"
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "outline" | "muted" | "violet" | "cyan" | "rose" | "amber" | "emerald";
}) {
  const styles: Record<string, string> = {
    default: "bg-white/[0.06] border-white/10 text-foreground",
    outline: "border-white/15 text-foreground",
    muted: "bg-muted text-muted-foreground border-white/5",
    violet: "bg-violet-500/15 border-violet-500/30 text-violet-200",
    cyan: "bg-cyan-500/15 border-cyan-500/30 text-cyan-200",
    rose: "bg-rose-500/15 border-rose-500/30 text-rose-200",
    amber: "bg-amber-500/15 border-amber-500/30 text-amber-200",
    emerald: "bg-emerald-500/15 border-emerald-500/30 text-emerald-200"
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        styles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
