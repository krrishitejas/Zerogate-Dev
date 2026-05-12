"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Github,
  Loader2,
  Play,
  RefreshCw,
  Rocket,
  ShieldAlert,
  Sparkles,
  Trash2,
  Wand2
} from "lucide-react";
import { cn, relativeTime, formatNumber } from "@/lib/utils";
import type { Severity } from "@/types/zg";

type Finding = {
  id: string;
  severity: Severity;
  category: string;
  title: string;
  description: string;
  filePath: string;
  line: number | null;
  agent: string;
  status: string;
  cwe: string | null;
  snippet: string | null;
  confidence: number;
  fixes: { id: string; rationale: string; before: string; after: string; patch: string; applied: boolean; iteration: number }[];
};

type AgentRun = {
  id: string;
  agent: string;
  status: string;
  message: string | null;
  startedAt: string;
  completedAt: string | null;
};

type EventRow = { id: string; kind: string; message: string; createdAt: string };
type Project = {
  id: string;
  name: string;
  status: string;
  source: string;
  repoUrl: string | null;
  fileCount: number;
  totalLOC: number;
  defaultBranch: string | null;
  updatedAt: string;
};
type Report = { id: string; title: string; summary: string; markdown: string; createdAt: string };

const SEV_ORDER: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];
const sevPill: Record<Severity, string> = {
  CRITICAL: "severity-critical",
  HIGH: "severity-high",
  MEDIUM: "severity-medium",
  LOW: "severity-low",
  INFO: "severity-info"
};

export function ProjectView({
  initialProject,
  initialFindings,
  initialAgentRuns,
  initialEvents,
  initialReports,
  pushEnabled
}: {
  initialProject: Project;
  initialFindings: Finding[];
  initialAgentRuns: AgentRun[];
  initialEvents: EventRow[];
  initialReports: Report[];
  pushEnabled: boolean;
}) {
  const router = useRouter();
  const [project, setProject] = useState(initialProject);
  const [findings, setFindings] = useState(initialFindings);
  const [agentRuns, setAgentRuns] = useState(initialAgentRuns);
  const [events, setEvents] = useState(initialEvents);
  const [reports, setReports] = useState(initialReports);
  const [scanning, startScan] = useTransition();
  const [active, setActive] = useState<Finding | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reportBusy, setReportBusy] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function refresh() {
    const res = await fetch(`/api/projects/${project.id}`);
    const j = await res.json();
    if (j.project) setProject(j.project);
    if (j.findings) setFindings(j.findings);
    if (j.agentRuns) setAgentRuns(j.agentRuns);
    if (j.events) setEvents(j.events);
    if (j.reports) setReports(j.reports);
  }

  // poll while scanning so the UI feels alive
  useEffect(() => {
    if (project.status !== "SCANNING" && project.status !== "IMPORTING" && project.status !== "ANALYZING") return;
    const t = setInterval(refresh, 2500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.status]);

  const counts = SEV_ORDER.reduce<Record<Severity, number>>((acc, s) => {
    acc[s] = findings.filter((f) => f.severity === s).length;
    return acc;
  }, { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 });

  function startScanAction() {
    startScan(async () => {
      setProject({ ...project, status: "SCANNING" });
      try {
        const res = await fetch(`/api/projects/${project.id}/scan`, { method: "POST" });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error ?? "Scan failed");
        toast.success("Scan complete");
        await refresh();
      } catch (err: any) {
        toast.error(err.message);
        await refresh();
      }
    });
  }

  async function generateFix(finding: Finding, regenerate = false) {
    setBusyId(finding.id);
    const startedAt = Date.now();
    try {
      const res = await fetch(`/api/findings/${finding.id}/fix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerate })
      });
      const j = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        const baseMsg = j.error ?? `Fix failed (${res.status})`;
        // Map common provider errors to something the user can act on.
        if (res.status === 429) throw new Error("Rate limited by the AI provider — wait a few seconds and try again.");
        if (res.status === 504 || /timed? ?out/i.test(baseMsg)) throw new Error("AI request timed out — try again.");
        throw new Error(baseMsg);
      }
      const seconds = Math.round((Date.now() - startedAt) / 100) / 10;
      toast.success(`${regenerate ? "Regenerated patch" : "Patch ready"} · ${seconds}s`);
      await refresh();
      setActive((cur) => cur ? findingsAfter(cur.id) : null);
    } catch (err: any) {
      toast.error(err.message ?? "Fix generation failed");
    } finally {
      setBusyId(null);
    }
    function findingsAfter(id: string) {
      return findings.find((f) => f.id === id) ?? null;
    }
  }

  async function applyFix(fixId: string) {
    setBusyId(fixId);
    try {
      const res = await fetch(`/api/fixes/${fixId}/apply`, { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Apply failed");
      toast.success("Fix applied — re-scan to verify");
      await refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function composeReport() {
    setReportBusy(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/report`, { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Report failed");
      toast.success("Executive report generated");
      await refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setReportBusy(false);
    }
  }

  async function pushToGithub() {
    setPushBusy(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/push`, { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Push failed");
      toast.success(`Pushed ${j.files} file(s) to ${j.repo} on ${j.branch}`);
      await refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setPushBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-3xl font-bold tracking-tight">{project.name}</h1>
            <Badge
              variant={project.status === "READY" ? "emerald" : project.status === "ERROR" ? "rose" : "violet"}
            >
              {project.status.toLowerCase()}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {project.repoUrl ? (
              <a href={project.repoUrl} target="_blank" rel="noreferrer" className="hover:text-foreground inline-flex items-center gap-1.5">
                <Github className="h-3.5 w-3.5" /> {project.repoUrl.replace("https://github.com/", "")}
              </a>
            ) : (
              <span>{project.source} import</span>
            )}
            <span className="mx-2">·</span>
            <span>{formatNumber(project.fileCount)} files</span>
            <span className="mx-2">·</span>
            <span>{formatNumber(project.totalLOC)} LOC</span>
            <span className="mx-2">·</span>
            <span>updated {relativeTime(project.updatedAt)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={startScanAction} disabled={scanning || project.status === "SCANNING"}>
            {scanning || project.status === "SCANNING" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Run vulnerability scan
          </Button>
          <Button variant="secondary" onClick={composeReport} disabled={reportBusy}>
            {reportBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Compose report
          </Button>
          {!confirmDelete ? (
            <Button
              variant="secondary"
              onClick={() => setConfirmDelete(true)}
              className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border-rose-500/20"
            >
              <Trash2 className="h-4 w-4" /> Delete project
            </Button>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5">
              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
              <span className="text-xs text-rose-300">Delete forever?</span>
              <Button
                size="sm"
                onClick={async () => {
                  setDeleteBusy(true);
                  try {
                    const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
                    const j = await res.json();
                    if (!res.ok) throw new Error(j.error ?? "Delete failed");
                    toast.success("Project deleted");
                    router.push("/dashboard/projects");
                  } catch (err: any) {
                    toast.error(err.message);
                    setDeleteBusy(false);
                    setConfirmDelete(false);
                  }
                }}
                disabled={deleteBusy}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                {deleteBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Yes, delete"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)} disabled={deleteBusy}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Severity counts */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {SEV_ORDER.map((sev) => (
          <div key={sev} className="card-cyber p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{sev}</div>
            <div className="mt-2 text-3xl font-bold font-display">{counts[sev]}</div>
            <div className={`mt-2 h-1 rounded-full ${sevToBar(sev)}`} />
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Findings list */}
        <div className="lg:col-span-2 card-cyber p-0 overflow-hidden relative">
          {(scanning || project.status === "SCANNING") && <div className="scan-overlay" />}
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <div className="font-semibold">Findings ({findings.length})</div>
            <div className="flex items-center gap-1.5">
              <ExportButton projectId={project.id} format="csv" label="CSV" icon={FileSpreadsheet} />
              <ExportButton projectId={project.id} format="xlsx" label="XLSX" icon={FileSpreadsheet} />
              <ExportButton projectId={project.id} format="zip" label="Project ZIP" icon={Download} />
            </div>
          </div>
          {findings.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              {project.status === "READY"
                ? "No findings yet — run a scan to dispatch the swarm."
                : "Scan running — findings will appear here in real-time."}
            </div>
          ) : (
            <ul className="divide-y divide-white/5 max-h-[640px] overflow-y-auto">
              {findings.map((f) => (
                <li key={f.id}>
                  <button
                    onClick={() => setActive(f)}
                    className={cn(
                      "w-full text-left px-5 py-3 hover:bg-white/[0.03] transition flex items-start gap-3",
                      active?.id === f.id && "bg-white/[0.04]"
                    )}
                  >
                    <span className={cn("pill border", sevPill[f.severity])}>{f.severity}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{f.title}</span>
                        {f.status === "FIXED" && (
                          <Badge variant="emerald" className="text-[10px]">fixed</Badge>
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground truncate">
                        {f.filePath}{f.line ? `:${f.line}` : ""} · {f.cwe ?? f.category} · agent: {f.agent}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Right column: agents + activity + report */}
        <div className="space-y-4">
          <div className="card-cyber p-5">
            <div className="flex items-center justify-between">
              <div className="font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-300" /> Agents
              </div>
              <Button size="sm" variant="ghost" onClick={refresh}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
            <ul className="mt-3 space-y-1.5 text-sm">
              {agentRuns.slice(0, 12).map((r) => (
                <li key={r.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-white/[0.03]">
                  <div>
                    <div className="text-foreground/90">{prettyAgent(r.agent)}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.message ?? r.status} · {relativeTime(r.startedAt)}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      r.status === "running" ? "bg-cyan-400 animate-pulse" :
                      r.status === "completed" ? "bg-emerald-400" :
                      r.status === "failed" ? "bg-rose-400" : "bg-white/20"
                    )}
                  />
                </li>
              ))}
              {agentRuns.length === 0 && (
                <li className="text-sm text-muted-foreground py-2">No agent activity yet.</li>
              )}
            </ul>
          </div>

          {/* Reports + push */}
          <div className="card-cyber p-5">
            <div className="font-semibold mb-3">Reports & delivery</div>
            <div className="space-y-2 text-sm">
              {reports.length === 0 ? (
                <p className="text-muted-foreground">No reports yet. Compose one after a scan completes.</p>
              ) : (
                reports.map((r) => (
                  <div key={r.id} className="rounded-lg border border-white/10 p-3">
                    <div className="font-medium">{r.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-3">{r.summary}</div>
                    <Link
                      href={`/dashboard/projects/${project.id}/reports/${r.id}`}
                      className="text-xs text-violet-300 hover:text-violet-200 mt-2 inline-flex items-center gap-1"
                    >
                      <FileText className="h-3 w-3" /> Open report
                    </Link>
                  </div>
                ))
              )}
              <div className="pt-2 flex flex-col gap-2">
                {pushEnabled && project.repoUrl && (
                  <Button onClick={pushToGithub} disabled={pushBusy} variant="secondary">
                    {pushBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                    Push fixes to GitHub
                  </Button>
                )}
                <a href={`/api/projects/${project.id}/export?format=zip`}>
                  <Button variant="secondary" className="w-full">
                    <Download className="h-4 w-4" /> Download patched ZIP
                  </Button>
                </a>
              </div>
            </div>
          </div>

          <div className="card-cyber p-5">
            <div className="font-semibold mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-300" /> Activity
            </div>
            <ul className="space-y-2 text-sm max-h-72 overflow-auto">
              {events.map((e) => (
                <li key={e.id} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-violet-400 shrink-0" />
                  <div>
                    <div className="text-foreground/90">{e.message}</div>
                    <div className="text-xs text-muted-foreground">{relativeTime(e.createdAt)}</div>
                  </div>
                </li>
              ))}
              {events.length === 0 && <li className="text-muted-foreground">No activity yet.</li>}
            </ul>
          </div>
        </div>
      </div>

      {/* Detail drawer */}
      {active && (
        <FindingDrawer
          finding={active}
          busyId={busyId}
          onClose={() => setActive(null)}
          onGenerate={() => generateFix(active, false)}
          onRegenerate={() => generateFix(active, true)}
          onApply={(fixId) => applyFix(fixId)}
        />
      )}
    </div>
  );
}

function FindingDrawer({
  finding,
  busyId,
  onClose,
  onGenerate,
  onRegenerate,
  onApply
}: {
  finding: Finding;
  busyId: string | null;
  onClose: () => void;
  onGenerate: () => void;
  onRegenerate: () => void;
  onApply: (fixId: string) => void;
}) {
  const last = finding.fixes?.[0];
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full md:w-[640px] bg-background border-l border-white/10 overflow-y-auto">
        <div className="sticky top-0 bg-background/90 backdrop-blur-xl border-b border-white/5 px-5 py-4 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className={cn("pill border", sevPill[finding.severity])}>{finding.severity}</span>
              <Badge variant="muted">{finding.category}</Badge>
              {finding.cwe && <Badge variant="outline">{finding.cwe}</Badge>}
            </div>
            <h2 className="mt-2 font-semibold">{finding.title}</h2>
            <div className="text-xs text-muted-foreground mt-1">
              {finding.filePath}{finding.line ? `:${finding.line}` : ""}
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>Close</Button>
        </div>

        <div className="px-5 py-5 space-y-5 text-sm">
          <section>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Description</div>
            <p className="leading-relaxed">{finding.description}</p>
          </section>

          {finding.snippet && (
            <section>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Snippet</div>
              <pre className="rounded-lg border border-white/10 bg-black/40 p-3 text-xs overflow-auto whitespace-pre-wrap">
{finding.snippet}
              </pre>
            </section>
          )}

          <section>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Fix Synthesizer</div>
              <div className="flex gap-2">
                {!last && (
                  <Button size="sm" onClick={onGenerate} disabled={!!busyId}>
                    {busyId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                    Generate fix
                  </Button>
                )}
                {last && (
                  <>
                    <Button size="sm" variant="secondary" onClick={onRegenerate} disabled={!!busyId}>
                      <RefreshCw className="h-3.5 w-3.5" /> Regenerate
                    </Button>
                    {!last.applied ? (
                      <Button size="sm" onClick={() => onApply(last.id)} disabled={!!busyId}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Apply
                      </Button>
                    ) : (
                      <Badge variant="emerald">applied</Badge>
                    )}
                  </>
                )}
              </div>
            </div>

            {!last ? (
              <div className="rounded-lg border border-dashed border-white/10 p-5 text-center text-muted-foreground text-xs">
                The Fix Synthesizer is idle. Click "Generate fix" to draft a patch.
              </div>
            ) : (!last.before?.trim() && !last.after?.trim() && !last.rationale?.trim()) ? (
              <div className="rounded-lg border border-dashed border-amber-500/30 bg-amber-500/5 p-4 text-xs text-amber-200/90">
                The AI returned an empty patch for this finding. This is usually a transient model issue —
                click <span className="font-medium">Regenerate</span> to try again.
              </div>
            ) : (
              <>
                {last.rationale?.trim() ? (
                  <p className="leading-relaxed mb-3">{last.rationale}</p>
                ) : (
                  <p className="leading-relaxed mb-3 italic text-muted-foreground">
                    No rationale was provided by the model.
                  </p>
                )}
                <div className="grid gap-3">
                  <div>
                    <div className="text-[10.5px] uppercase tracking-wider text-rose-300/80 mb-1">before</div>
                    <pre className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 text-xs overflow-auto whitespace-pre-wrap">
{last.before || "(empty)"}
                    </pre>
                  </div>
                  <div>
                    <div className="text-[10.5px] uppercase tracking-wider text-emerald-300/80 mb-1">after</div>
                    <pre className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs overflow-auto whitespace-pre-wrap">
{last.after || "(empty)"}
                    </pre>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-2">Iteration {last.iteration}</div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function ExportButton({
  projectId, format, label, icon: Icon
}: {
  projectId: string;
  format: "csv" | "xlsx" | "zip";
  label: string;
  icon: any;
}) {
  return (
    <a href={`/api/projects/${projectId}/export?format=${format}`}>
      <Button variant="ghost" size="sm">
        <Icon className="h-3.5 w-3.5" /> {label}
      </Button>
    </a>
  );
}

function sevToBar(s: Severity) {
  return {
    CRITICAL: "bg-gradient-to-r from-rose-500 to-orange-500",
    HIGH:     "bg-gradient-to-r from-orange-500 to-amber-500",
    MEDIUM:   "bg-gradient-to-r from-amber-500 to-yellow-500",
    LOW:      "bg-gradient-to-r from-sky-500 to-cyan-400",
    INFO:     "bg-gradient-to-r from-zinc-500 to-zinc-400"
  }[s];
}

function prettyAgent(id: string) {
  return id
    .split("-")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}
