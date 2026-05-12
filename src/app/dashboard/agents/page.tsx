import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getPlan } from "@/lib/session";
import { AGENTS } from "@/lib/agents/registry";
import { agentIcon } from "@/lib/agents/icons";
import { PLAN_LIMITS } from "@/lib/plans";
import { Lock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  const plan = getPlan(user);
  const allowed = new Set(PLAN_LIMITS[plan].agents);

  const total = AGENTS.length;
  const unlocked = AGENTS.filter((a) => allowed.has(a.name)).length;

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[36px] sm:text-[44px] leading-[1.05] tracking-tight text-cream">
            <span className="italic text-amber-phosphor">{unlocked}</span> of {total} agents.
          </h1>
          <p className="mt-2 font-reading text-[15px] leading-[1.55] text-cream-dim max-w-xl">
            Each agent does one thing well. Locked agents unlock with your plan.
          </p>
        </div>
        {plan !== "MAX" && (
          <Link href="/dashboard/billing" className="btn-amber">
            Unlock more →
          </Link>
        )}
      </div>

      {/* Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {AGENTS.map((a) => {
          const isUnlocked = allowed.has(a.name);
          const Icon = agentIcon(a.id);
          return (
            <div
              key={a.id}
              className={`border bg-ink-2 p-5 transition-colors ${
                isUnlocked
                  ? "border-rule hover:border-amber-phosphor/40"
                  : "border-rule/60 opacity-70 hover:opacity-100"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className={`flex h-11 w-11 items-center justify-center border bg-ink ${
                    isUnlocked
                      ? "border-amber-phosphor/40 text-amber-phosphor"
                      : "border-rule text-cream-faint"
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                </div>
                {isUnlocked ? (
                  <span className="chip chip-moss">active</span>
                ) : (
                  <span className="chip chip-amber inline-flex items-center gap-1.5">
                    <Lock className="h-3 w-3" strokeWidth={1.5} />
                    {a.minPlan}
                  </span>
                )}
              </div>

              <h3
                className={`mt-4 font-display text-[22px] italic leading-tight ${
                  isUnlocked ? "text-cream" : "text-cream-dim"
                }`}
              >
                {a.name}
              </h3>
              <div className="mt-1 text-[12px] text-cream-faint">{a.role}</div>

              <p className="mt-3 text-[13.5px] leading-[1.55] text-cream-dim">
                {a.summary}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
