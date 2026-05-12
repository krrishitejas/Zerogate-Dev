import { redirect } from "next/navigation";
import { getCurrentUser, getPlan } from "@/lib/session";
import { prisma } from "@/lib/db";
import { PLAN_LIMITS, PLAN_PRICING, formatInr, type Plan } from "@/lib/plans";
import { Check, Minus } from "lucide-react";
import { BillingPlanSwitcher } from "@/components/dashboard/billing-plan-switcher";

export const dynamic = "force-dynamic";

const ORDER: Plan[] = ["FREE", "PRO", "MAX"];

export default async function BillingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  const plan = getPlan(user);
  const limits = PLAN_LIMITS[plan];
  const pricing = PLAN_PRICING[plan];

  // Usage numbers
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [projectsUsed, scansThisMonth, totalFiles] = await Promise.all([
    prisma.project.count({ where: { userId: user.id } }),
    prisma.scan.count({
      where: { project: { userId: user.id }, startedAt: { gte: startOfMonth } }
    }),
    prisma.sourceFile.count({ where: { project: { userId: user.id } } })
  ]);

  const usage = [
    {
      label: "Projects",
      used: projectsUsed,
      cap: limits.maxProjects >= 999 ? null : limits.maxProjects
    },
    {
      label: "Files indexed",
      used: totalFiles,
      cap: null
    },
    {
      label: "Scans this month",
      used: scansThisMonth,
      cap: limits.maxScansPerMonth >= 100000 ? null : limits.maxScansPerMonth
    }
  ];

  const compareRows = buildComparisonRows();

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="font-display text-[36px] sm:text-[44px] leading-[1.05] tracking-tight text-cream">
          Plan: <span className="italic text-amber-phosphor">{plan.toLowerCase()}.</span>
        </h1>
        <p className="mt-2 font-reading text-[15px] leading-[1.55] text-cream-dim max-w-xl">
          {pricing.monthlyInr === 0
            ? "Free forever. Upgrade for more agents and higher limits."
            : `${formatInr(pricing.monthlyInr)}/month · cancel any time.`}
        </p>
      </div>

      {/* Current usage */}
      <div className="grid gap-px sm:grid-cols-3 bg-rule border border-rule">
        {usage.map((u) => (
          <UsageCard key={u.label} label={u.label} used={u.used} cap={u.cap} />
        ))}
      </div>

      {/* Comparison table */}
      <div className="border border-rule overflow-hidden">
        {/* Plan header row */}
        <div className="grid grid-cols-4 bg-ink-2 border-b border-rule">
          <div className="hidden sm:block px-5 py-6">
            <span className="text-[12px] text-cream-faint">Tier</span>
          </div>
          {ORDER.map((p) => {
            const price = PLAN_PRICING[p];
            const isCurrent = p === plan;
            return (
              <div
                key={p}
                className={`px-5 py-6 sm:border-l border-rule relative ${
                  p === "PRO" ? "bg-ink-3" : ""
                }`}
              >
                {isCurrent && (
                  <span className="absolute top-3 right-3 chip chip-amber">current</span>
                )}
                <div className="font-display text-[26px] italic leading-none text-cream">
                  {p.toLowerCase()}.
                </div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-display text-[36px] leading-none text-cream">
                    {formatInr(price.monthlyInr)}
                  </span>
                  <span className="text-[12px] text-cream-faint">/mo</span>
                </div>
                {price.annualInr > 0 && (
                  <div className="mt-1.5 text-[12px] text-cream-faint">
                    {formatInr(price.annualInr)} / year
                  </div>
                )}
                <div className="mt-5">
                  <BillingPlanSwitcher targetPlan={p} currentPlan={plan} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Comparison rows */}
        <div className="divide-y divide-rule">
          {compareRows.map((row) => (
            <div key={row.label} className="grid grid-cols-4 items-center">
              <div className="px-5 py-3.5 hidden sm:block">
                <span className="text-[13px] text-cream-dim">{row.label}</span>
              </div>
              {row.values.map((v, i) => (
                <div
                  key={i}
                  className={`px-5 py-3.5 sm:border-l border-rule ${
                    ORDER[i] === "PRO" ? "bg-ink-3" : ""
                  }`}
                >
                  <div className="sm:hidden mb-1 text-[12px] text-cream-faint">
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
      </div>

      {/* Note */}
      <p className="text-[12px] text-cream-faint">
        All prices in INR. GST extra.
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */

function UsageCard({
  label,
  used,
  cap
}: {
  label: string;
  used: number;
  cap: number | null;
}) {
  const pct = cap ? Math.min(100, Math.round((used / cap) * 100)) : null;
  const overHalf = pct !== null && pct >= 50;
  const overEighty = pct !== null && pct >= 80;
  const barColor = overEighty ? "bg-crit" : overHalf ? "bg-amber-phosphor" : "bg-moss";

  return (
    <div className="bg-ink-2 px-5 py-5">
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-cream-faint">{label}</span>
        {pct !== null && (
          <span
            className={`text-[12px] ${
              overEighty ? "text-crit" : overHalf ? "text-amber-phosphor" : "text-cream-dim"
            }`}
          >
            {pct}%
          </span>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-display text-[36px] italic leading-none text-cream">
          {used.toLocaleString()}
        </span>
        {cap !== null && (
          <span className="text-[12px] text-cream-faint">
            / {cap.toLocaleString()}
          </span>
        )}
      </div>
      {pct !== null && (
        <div className="mt-4 h-1 bg-ink overflow-hidden">
          <div
            className={`h-full ${barColor} transition-all`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

type Row =
  | { label: string; values: (string | number)[]; type: "text" }
  | { label: string; values: boolean[]; type: "bool" };

function buildComparisonRows(): Row[] {
  const fmt = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` :
    n >= 1_000     ? `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k` :
    String(n);

  return [
    {
      label: "Projects",
      type: "text",
      values: ORDER.map((p) =>
        PLAN_LIMITS[p].maxProjects >= 999 ? "Unlimited" : String(PLAN_LIMITS[p].maxProjects)
      )
    },
    {
      label: "Files / project",
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
      label: "Auto-fix",
      type: "bool",
      values: ORDER.map((p) => PLAN_LIMITS[p].agents.includes("Fix Synthesizer"))
    },
    {
      label: "Real-time watch",
      type: "bool",
      values: ORDER.map((p) => PLAN_LIMITS[p].realtimeWatch)
    },
    {
      label: "Push to GitHub",
      type: "bool",
      values: ORDER.map((p) => PLAN_LIMITS[p].pushToGithub)
    },
    {
      label: "Support",
      type: "text",
      values: ORDER.map((p) => cap(PLAN_LIMITS[p].supportLevel))
    }
  ];
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
