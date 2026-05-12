import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import {
  Github,
  GitFork,
  FileArchive,
  Plus,
  ArrowRight,
  type LucideIcon
} from "lucide-react";
import { relativeTime, formatNumber } from "@/lib/utils";
import { ProjectRescanButton } from "@/components/dashboard/project-rescan-button";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      findings: {
        where: { status: "OPEN" },
        select: { severity: true }
      },
      scans: {
        orderBy: { startedAt: "desc" },
        take: 1,
        select: { startedAt: true, completedAt: true, status: true }
      }
    }
  });

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[36px] sm:text-[44px] leading-[1.05] tracking-tight text-cream">
            <span className="italic text-amber-phosphor">{projects.length}</span>{" "}
            {projects.length === 1 ? "project." : "projects."}
          </h1>
          <p className="mt-2 font-reading text-[15px] leading-[1.55] text-cream-dim max-w-xl">
            Connected repos and uploads. Click to open or rescan.
          </p>
        </div>
        <Link href="/dashboard/projects/new" className="btn-amber">
          <Plus className="h-3.5 w-3.5" /> New project
        </Link>
      </div>

      {projects.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="border border-rule overflow-hidden">
          {/* Header row */}
          <div className="hidden md:grid grid-cols-12 gap-4 bg-ink-2 px-5 py-3 border-b border-rule text-[11.5px] text-cream-faint">
            <div className="col-span-4">Project</div>
            <div className="col-span-2">Last scan</div>
            <div className="col-span-3">Findings</div>
            <div className="col-span-1 text-center">Status</div>
            <div className="col-span-2 text-right">Action</div>
          </div>

          {/* Rows */}
          <ul className="divide-y divide-rule">
            {projects.map((p) => {
              const SourceIcon = sourceIcon(p.source);
              const sevCounts = countSeverities(p.findings);
              const lastScan = p.scans[0];
              const lastScanAt = lastScan?.completedAt ?? lastScan?.startedAt ?? null;

              return (
                <li
                  key={p.id}
                  className="group grid grid-cols-1 md:grid-cols-12 gap-4 px-5 py-4 bg-ink-2 hover:bg-ink-3/70 transition-colors"
                >
                  {/* Project */}
                  <div className="md:col-span-4 min-w-0">
                    <Link
                      href={`/dashboard/projects/${p.id}`}
                      className="flex items-center gap-3 min-w-0"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-rule bg-ink text-cream-dim group-hover:text-amber-phosphor group-hover:border-amber-phosphor/50 transition-colors">
                        <SourceIcon className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[14px] text-cream truncate group-hover:text-amber-phosphor transition-colors">
                          {p.name}
                        </div>
                        <div className="text-[12px] text-cream-faint truncate">
                          {formatNumber(p.fileCount)} files · {formatNumber(p.totalLOC)} LOC
                        </div>
                      </div>
                    </Link>
                  </div>

                  {/* Last scan */}
                  <div className="md:col-span-2 flex md:block items-center gap-2">
                    <span className="md:hidden text-[11.5px] text-cream-faint">Last scan</span>
                    <span className="text-[13px] text-cream-dim">
                      {lastScanAt ? relativeTime(lastScanAt) : "—"}
                    </span>
                  </div>

                  {/* Findings — severity grid */}
                  <div className="md:col-span-3">
                    <SeverityRow counts={sevCounts} />
                  </div>

                  {/* Status */}
                  <div className="md:col-span-1 flex md:justify-center items-center">
                    <StatusChip status={p.status} />
                  </div>

                  {/* Actions */}
                  <div className="md:col-span-2 flex md:justify-end items-center gap-2">
                    <ProjectRescanButton projectId={p.id} disabled={p.status === "ANALYZING"} />
                    <Link
                      href={`/dashboard/projects/${p.id}`}
                      className="inline-flex h-8 w-8 items-center justify-center border border-rule text-cream-dim hover:text-amber-phosphor hover:border-amber-phosphor/50 transition-colors"
                      aria-label="Open project"
                    >
                      <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */

function EmptyState() {
  return (
    <div className="border border-rule bg-ink-2 p-14 text-center">
      <div className="mx-auto h-12 w-12 border border-rule bg-ink flex items-center justify-center text-amber-phosphor">
        <Plus className="h-5 w-5" strokeWidth={1.5} />
      </div>
      <h2 className="mt-6 font-display text-[28px] italic text-cream">
        No projects yet.
      </h2>
      <p className="mt-2 text-[14px] text-cream-dim max-w-md mx-auto">
        Connect a repo to start your first scan.
      </p>
      <Link href="/dashboard/projects/new" className="btn-amber mt-7 inline-flex">
        <Plus className="h-3.5 w-3.5" /> Connect repo
      </Link>
    </div>
  );
}

function SeverityRow({ counts }: { counts: { crit: number; high: number; med: number; total: number } }) {
  if (counts.total === 0) {
    return (
      <span className="text-[12.5px] text-moss">✓ clean</span>
    );
  }
  return (
    <div className="flex items-center gap-3 text-[12.5px]">
      {counts.crit > 0 && (
        <span className="flex items-center gap-1.5 text-crit">
          <span className="h-1.5 w-1.5 rounded-full bg-crit" />
          {counts.crit} crit
        </span>
      )}
      {counts.high > 0 && (
        <span className="flex items-center gap-1.5 text-amber-soft">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-soft" />
          {counts.high} high
        </span>
      )}
      {counts.med > 0 && (
        <span className="flex items-center gap-1.5 text-cream-dim">
          <span className="h-1.5 w-1.5 rounded-full bg-cream-faint" />
          {counts.med} med
        </span>
      )}
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

function countSeverities(findings: { severity: string }[]) {
  let crit = 0, high = 0, med = 0;
  for (const f of findings) {
    const s = f.severity.toUpperCase();
    if (s === "CRITICAL") crit++;
    else if (s === "HIGH") high++;
    else if (s === "MEDIUM") med++;
  }
  return { crit, high, med, total: crit + high + med };
}
