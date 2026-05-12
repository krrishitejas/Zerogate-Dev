"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { Plan } from "@/lib/plans";

/**
 * Compact plan-switch action used in the /billing comparison table.
 * - Disabled when targetPlan === currentPlan
 * - PRO upgrade is highlighted with the amber CTA
 */
export function BillingPlanSwitcher({
  targetPlan,
  currentPlan
}: {
  targetPlan: Plan;
  currentPlan: Plan;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (targetPlan === currentPlan) {
    return (
      <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-cream-faint border border-rule px-3 py-2 text-center">
        ▸ active
      </div>
    );
  }

  async function change() {
    setBusy(true);
    try {
      const res = await fetch("/api/user/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: targetPlan })
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Failed to switch plan");
      toast.success(`Switched to ${targetPlan}`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to switch plan");
    } finally {
      setBusy(false);
    }
  }

  const isPro = targetPlan === "PRO";
  const label =
    targetPlan === "FREE" ? "Downgrade" :
    targetPlan === "MAX"  ? "Talk to sales" :
    "Upgrade";

  return (
    <button
      onClick={change}
      disabled={busy}
      className={`w-full justify-center ${isPro ? "btn-amber" : "btn-outline"} text-[11px]`}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
      {label} →
    </button>
  );
}
