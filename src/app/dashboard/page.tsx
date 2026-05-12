import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getPlan } from "@/lib/session";
import { prisma } from "@/lib/db";
import { PLAN_LIMITS } from "@/lib/plans";
import { AGENTS } from "@/lib/agents/registry";
import { agentIcon } from "@/lib/agents/icons";
import {
  ArrowRight,
  FolderGit2,
  ShieldAlert,
  Wand2,
  Activity,
  Plus,
  Github,
  GitFork,
  FileArchive,
  type LucideIcon
} from "lucide-react";
import { relativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardOverviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  const plan = getPlan(user);
  const limits = PLAN_LIMITS[plan];

  const [projects, totalProjects, totalFindings, openFindings, fixesApplied, activeScans, recentEvents] = await Promise.all([
    prisma.project.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: {
        _count: { select: { findings: { where: { status: "OPEN" } } } }
      }
    }),
    prisma.project.count({ where: { userId: user.id } }),
    prisma.finding.count({ where: { project: { userId: user.id } } }),
    prisma.finding.count({ where: { project: { userId: user.id }, status: "OPEN" } }),
    prisma.fix.count({ where: { applied: true, finding: { project: { userId: user.id } } } }),
    prisma.scan.count({
      where: {
        project: { userId: user.id },
        status: { in: ["PENDING", "RUNNING"] }
      }
    }),
    prisma.projectEvent.findMany({
      where: { project: { userId: user.id } },
      orderBy: { createdAt: "desc" },
      take: 8
    })
  ]);

  const firstName = user.name ? user.name.split(" ")[0] : null;

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[36px] sm:text-[44px] leading-[1.05] tracking-tight text-cream">
            {firstName ? <>Welcome back, <span className="italic text-amber-phosphor">{firstName}.</span></> : <span className="italic text-amber-phosphor">Welcome back.</span>}
          </h1>
          <p className="mt-2 font-reading text-[15px] leading-[1.55] text-cream-dim max-w-xl">
            {activeScans > 0
              ? `${activeScans} scan${activeScans === 1 ? "" : "s"} running.`
              : "No active scans. Connect a repo to start."}
          </p>
        </div>
        <Link href="/dashboard/projects/new" className="btn-amber">
          <Plus className="h-3.5 w-3.5" /> New scan
        </Link>
      </div>

      {/* Stat strip */}
      <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-4 bg-rule border border-rule">
        <Stat
          label="Active scans"
          value={activeScans}
          icon={Activity}
          live={activeScans > 0}
        />
        <Stat
          label="Repos connected"
          value={totalProjects}
          cap={limits.maxProjects >= 999 ? undefined : limits.maxProjects}
          icon={FolderGit2}
        />
        <Stat
          label="Open findings"
          value={openFindings}
          icon={ShieldAlert}
          accent={openFindings > 0 ? "crit" : "neutral"}
        />
        <Stat
          label="Fixes applied"
          value={fixesApplied}
          icon={Wand2}
          accent={fixesApplied > 0 ? "moss" : "neutral"}
        />
      </div>

      {/* Recent + Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent projects */}
        <div className="lg:col-span-2 border border-rule bg-ink-2 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[22px] italic text-cream">Recent projects</h2>
            <Link
              href="/dashboard/projects"
              className="text-[12.5px] text-cream-faint hover:text-amber-phosphor transition-colors flex items-center gap-1.5"
            >
              View all <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
            </Link>
          </div>

          {projects.length === 0 ? (
            <div className="mt-6 border border-dashed border-rule p-10 text-center">
              <p className="text-[14px] text-cream-dim">
                No projects yet.
              </p>
              <Link href="/dashboard/projects/new" className="btn-amber mt-5 inline-flex">
                <Plus className="h-3.5 w-3.5" /> Connect repo
              </Link>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-rule">
              {projects.map((p) => {
                const SourceIcon = sourceIcon(p.source);
                return (
                  <li key={p.id}>
                    <Link
                      href={`/dashboard/projects/${p.id}`}
                      className="group flex items-center justify-between gap-3 py-3 -mx-2 px-2 hover:bg-ink-3/40 transition-colors rounded-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-rule bg-ink text-cream-dim group-hover:text-amber-phosphor group-hover:border-amber-phosphor/50 transition-colors">
                          <SourceIcon className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[14px] text-cream truncate">
                            {p.name}
                          </div>
                          <div className="text-[12px] text-cream-faint">
                            {p.fileCount.toLocaleString()} files · {relativeTime(p.updatedAt)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {p._count.findings > 0 && (
                          <span className="chip chip-crit">
                            {p._count.findings} open
                          </span>
                        )}
                        <StatusChip status={p.status} />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Activity feed */}
        <div className="border border-rule bg-ink-2 p-6">
          <h2 className="font-display text-[22px] italic text-cream">Activity</h2>

          {recentEvents.length === 0 ? (
            <p className="mt-4 text-[14px] text-cream-dim">
              Run a scan to see activity here.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {recentEvents.map((e) => (
                <li key={e.id} className="flex items-start gap-2.5 text-[13px] leading-[1.5]">
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-amber-phosphor shrink-0" />
                  <div className="min-w-0">
                    <div className="text-cream-dim">{e.message}</div>
                    <div className="text-[11.5px] text-cream-faint mt-0.5">
                      {relativeTime(e.createdAt)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Available agents */}
      <div className="border border-rule bg-ink-2 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-[22px] italic text-cream">Your swarm</h2>
            <p className="mt-1 text-[12.5px] text-cream-faint">{plan} plan</p>
          </div>
          {plan !== "MAX" && (
            <Link
              href="/dashboard/billing"
              className="text-[12.5px] text-amber-phosphor hover:underline"
            >
              Unlock more →
            </Link>
          )}
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {AGENTS.filter((a) => limits.agents.includes(a.name)).slice(0, 8).map((a) => {
            const Icon = agentIcon(a.id);
            return (
              <div
                key={a.id}
                className="border border-rule bg-ink/40 p-3 flex items-center gap-3 hover:border-amber-phosphor/40 transition-colors"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-rule bg-ink text-amber-phosphor">
                  <Icon className="h-4 w-4" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] text-cream truncate">{a.name}</div>
                  <div className="text-[11.5px] text-cream-faint truncate">{a.role}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */

function Stat({
  label,
  value,
  cap,
  icon: Icon,
  accent = "neutral",
  live = false
}: {
  label: string;
  value: number;
  cap?: number;
  icon: LucideIcon;
  accent?: "neutral" | "crit" | "moss" | "amber";
  live?: boolean;
}) {
  const valueColor =
    accent === "crit" ? "text-crit" :
    accent === "moss" ? "text-moss" :
    accent === "amber" ? "text-amber-phosphor" :
    "text-cream";

  return (
    <div className="bg-ink-2 px-5 py-5">
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-cream-faint">{label}</span>
        <Icon className="h-4 w-4 text-cream-faint" strokeWidth={1.5} />
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className={`font-display text-[40px] italic leading-none ${valueColor}`}>
          {value}
        </span>
        {typeof cap === "number" && (
          <span className="text-[12px] text-cream-faint">/ {cap}</span>
        )}
        {live && (
          <span className="ml-auto flex items-center gap-1.5 text-[11px] text-amber-phosphor">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-phosphor animate-blink" />
            live
          </span>
        )}
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const s = status.toUpperCase();
  if (s === "READY") return <span className="chip chip-moss">ready</span>;
  if (s === "ERROR") return <span className="chip chip-crit">error</span>;
  if (s === "ANALYZING" || s === "SCANNING" || s === "PENDING") {
    return (
      <span className="chip chip-amber inline-flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-phosphor animate-blink" />
        {s.toLowerCase()}
      </span>
    );
  }
  return <span className="chip">{s.toLowerCase()}</span>;
}

function sourceIcon(source: string): LucideIcon {
  if (source === "GITHUB") return Github;
  if (source === "FORK")   return GitFork;
  return FileArchive;
}
