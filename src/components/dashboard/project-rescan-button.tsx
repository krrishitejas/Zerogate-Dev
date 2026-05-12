"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, RotateCcw } from "lucide-react";

/**
 * Compact rescan trigger used in the projects table.
 * Calls POST /api/projects/[id]/scan, refreshes route data on completion.
 */
export function ProjectRescanButton({
  projectId,
  disabled
}: {
  projectId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function rescan() {
    if (busy || disabled) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/scan`, { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Scan failed");
      }
      toast.success("Scan started");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Scan failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={rescan}
      disabled={busy || disabled}
      className="inline-flex h-8 w-8 items-center justify-center border border-rule text-cream-dim hover:text-amber-phosphor hover:border-amber-phosphor/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      aria-label="Rescan"
      title="Rescan"
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
      ) : (
        <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
      )}
    </button>
  );
}
