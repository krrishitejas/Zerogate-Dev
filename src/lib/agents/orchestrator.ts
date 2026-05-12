import { prisma } from "@/lib/db";
import { runAllScanners, shouldScanFile } from "@/lib/scanner";
import {
  aiComplete,
  AIProviderError,
  extractJSON,
  MODEL_CODE,
  MODEL_REASONING,
  MODEL_FIX_SYNTHESIZER,
  MODEL_SQLI_HUNTER,
  MODEL_XSS_DEFENDER,
  MODEL_SECRET_SENTINEL,
  MODEL_AUTH_CRYPTO,
  MODEL_SSRF_PATH,
  MODEL_DEPENDENCY_AUDITOR,
  type AICallOptions,
  type AIResponse
} from "@/lib/ai/openrouter";
import {
  cartographerPrompt,
  explainFindingPrompt,
  generateFixPrompt,
  reportSummaryPrompt,
  SYSTEM_BASE
} from "@/lib/ai/prompts";
import type { Scan } from "@prisma/client";

/* ───────────────────────── agent → model map ───────────────────── */
const AGENT_MODEL_MAP: Record<string, string> = {
  "sqli-hunter":        MODEL_SQLI_HUNTER,
  "xss-defender":       MODEL_XSS_DEFENDER,
  "secret-sentinel":    MODEL_SECRET_SENTINEL,
  "auth-crypto":        MODEL_AUTH_CRYPTO,
  "ssrf-path":          MODEL_SSRF_PATH,
  "dependency-auditor": MODEL_DEPENDENCY_AUDITOR,
  "fix-synthesizer":    MODEL_FIX_SYNTHESIZER
};

/** Resolve the best model for a given agent, falling back to MODEL_REASONING. */
function modelForAgent(agent: string): string {
  return AGENT_MODEL_MAP[agent] ?? MODEL_REASONING;
}

/* ───────────────────────── helpers ──────────────────────────────── */
async function event(projectId: string, kind: string, message: string, meta?: any) {
  await prisma.projectEvent.create({
    data: {
      projectId,
      kind,
      message,
      meta: meta ? JSON.stringify(meta) : null
    }
  });
}

async function startAgentRun(projectId: string, agent: string, message?: string) {
  return prisma.agentRun.create({
    data: { projectId, agent, message: message ?? null, status: "running" }
  });
}

async function finishAgentRun(id: string, status: "completed" | "failed", message?: string, meta?: any) {
  await prisma.agentRun.update({
    where: { id },
    data: {
      status,
      completedAt: new Date(),
      message: message ?? undefined,
      meta: meta ? JSON.stringify(meta) : undefined
    }
  });
}

/**
 * Call aiComplete with a hard timeout (per attempt) and one retry on transient errors
 * (HTTP 408 / 425 / 429 / 5xx, AbortError, network failures). The Fix Synthesizer
 * route is the main consumer — without this, a single slow/blip from the provider
 * surfaces to users as "fix generation failed".
 */
async function aiCompleteResilient(
  opts: AICallOptions,
  { timeoutMs = 75_000, maxAttempts = 2 }: { timeoutMs?: number; maxAttempts?: number } = {}
): Promise<AIResponse> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      return await aiComplete({ ...opts, signal: ctrl.signal });
    } catch (err: any) {
      lastErr = err;
      const transient = isTransientAIError(err);
      if (!transient || attempt === maxAttempts) break;
      // Tiny backoff before retrying (200ms, then 600ms…)
      await new Promise((r) => setTimeout(r, 200 * attempt * attempt + Math.random() * 150));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("AI request failed");
}

function isTransientAIError(err: unknown): boolean {
  if (!err) return false;
  if (err instanceof AIProviderError) {
    return err.status === 0 || err.status === 408 || err.status === 425 || err.status === 429 || err.status >= 500;
  }
  const name = (err as any)?.name;
  const code = (err as any)?.code;
  if (name === "AbortError") return true;
  if (typeof code === "string" && /ECONNRESET|ETIMEDOUT|EAI_AGAIN|UND_ERR_SOCKET/i.test(code)) return true;
  return false;
}

/**
 * Apply an AI-suggested before/after patch to a file's content.
 * 1) Tries exact `replace(before, after)` for the first occurrence.
 * 2) Falls back to a whitespace-tolerant match if the exact one missed.
 * Returns `null` if the patch site couldn't be located OR if it isn't unique.
 */
function applyBeforeAfterPatch(content: string, before: string, after: string): string | null {
  if (!before || !content.length) return null;

  // Exact match — preferred path.
  const firstIdx = content.indexOf(before);
  if (firstIdx !== -1) {
    const secondIdx = content.indexOf(before, firstIdx + 1);
    if (secondIdx !== -1) return null; // ambiguous — refuse to guess
    return content.slice(0, firstIdx) + after + content.slice(firstIdx + before.length);
  }

  // Whitespace-tolerant fallback: collapse runs of whitespace and try again.
  const norm = (s: string) => s.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ");
  const haystack = norm(content);
  const needle = norm(before);
  const idx = haystack.indexOf(needle);
  if (idx === -1) return null;
  const second = haystack.indexOf(needle, idx + 1);
  if (second !== -1) return null;

  // Map the normalized index back to the original string by walking forward.
  // This is approximate but safer than risking a wrong replacement.
  let oi = 0;
  let ni = 0;
  while (ni < idx && oi < content.length) {
    const oCh = content[oi];
    const nCh = haystack[ni];
    if (oCh === nCh) {
      oi++;
      ni++;
    } else if (/[ \t\r\n]/.test(oCh)) {
      oi++;
    } else {
      // Mismatch we can't reconcile — bail out rather than miscut.
      return null;
    }
  }
  // Find the end of the matched region in the original content by consuming
  // characters until we have advanced the same number of *normalized* chars
  // as `needle.length`.
  let consumed = 0;
  let end = oi;
  while (consumed < needle.length && end < content.length) {
    const oCh = content[end];
    if (/[ \t]/.test(oCh)) {
      // collapse whitespace runs to a single space in normalized form
      consumed++;
      end++;
      while (end < content.length && /[ \t]/.test(content[end])) end++;
    } else {
      consumed++;
      end++;
    }
  }
  return content.slice(0, oi) + after + content.slice(end);
}

/* ───────────────────────── Cartographer (RAG-light) ─────────────── */
export async function runCartographer(projectId: string) {
  const run = await startAgentRun(projectId, "code-cartographer", "Indexing files & inferring stack");
  try {
    const files = await prisma.sourceFile.findMany({
      where: { projectId },
      select: { path: true, language: true }
    });
    const languages: Record<string, number> = {};
    for (const f of files) {
      const k = f.language || "other";
      languages[k] = (languages[k] || 0) + 1;
    }

    const langArray = Object.entries(languages).map(([lang, files]) => ({ lang, files }));
    const tree = files
      .slice(0, 200)
      .map((f) => f.path)
      .join("\n");

    const ai = await aiComplete({
      model: MODEL_REASONING,
      json: true,
      messages: [
        { role: "system", content: SYSTEM_BASE },
        { role: "user", content: cartographerPrompt({ tree, languages: langArray }) }
      ]
    });
    const parsed = extractJSON<{
      stack?: string;
      entrypoints?: string[];
      criticalSurfaces?: string[];
      suggestedAgents?: string[];
    }>(ai.content);

    await finishAgentRun(run.id, "completed", parsed?.stack ?? "Indexed", parsed);
    await event(projectId, "cartographer", `Indexed ${files.length} files`, parsed);
    return parsed;
  } catch (err: any) {
    await finishAgentRun(run.id, "failed", err?.message ?? "failed");
    throw err;
  }
}

/* ───────────────────────── Vulnerability scan (swarm) ────────────── */
export async function runVulnerabilityScan(projectId: string, triggeredBy = "user"): Promise<Scan> {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error("Project not found");

  const scan = await prisma.scan.create({
    data: { projectId, status: "RUNNING", triggeredBy }
  });

  await prisma.project.update({ where: { id: projectId }, data: { status: "SCANNING" } });

  const files = await prisma.sourceFile.findMany({ where: { projectId } });

  const counts: Record<string, number> = {};
  let total = 0;

  // Run scanners per agent so the dashboard can show them as separate runs.
  const agentBuckets: Record<string, string> = {
    "sqli-hunter": "SQLi Hunter scanning",
    "xss-defender": "XSS Defender scanning",
    "secret-sentinel": "Secret Sentinel scanning",
    "auth-crypto": "Auth & Crypto Inspector scanning",
    "ssrf-path": "SSRF / Path Traversal Sentinel scanning",
    "dependency-auditor": "Dependency Auditor scanning"
  };

  const runs: Record<string, string> = {};
  for (const [agent, msg] of Object.entries(agentBuckets)) {
    const r = await startAgentRun(projectId, agent, msg);
    runs[agent] = r.id;
  }

  const findingsByAgent: Record<string, number> = {};

  for (const file of files) {
    if (!shouldScanFile(file.path)) continue;

    const raw = runAllScanners({
      path: file.path,
      content: file.content,
      language: file.language
    });

    for (const r of raw) {
      counts[r.severity] = (counts[r.severity] || 0) + 1;
      findingsByAgent[r.agent] = (findingsByAgent[r.agent] || 0) + 1;
      total++;
      await prisma.finding.create({
        data: {
          scanId: scan.id,
          projectId,
          fileId: file.id,
          agent: r.agent,
          category: r.category,
          severity: r.severity,
          cwe: r.cwe,
          title: r.title,
          description: r.description,
          filePath: r.filePath,
          line: r.line,
          endLine: r.endLine,
          snippet: r.snippet,
          confidence: r.confidence ?? 0.85
        }
      });
    }
  }

  for (const [agent, runId] of Object.entries(runs)) {
    await finishAgentRun(
      runId,
      "completed",
      `${findingsByAgent[agent] ?? 0} finding(s)`,
      { findings: findingsByAgent[agent] ?? 0 }
    );
  }

  const summary = `Found ${total} issues — ${counts["CRITICAL"] || 0} critical, ${counts["HIGH"] || 0} high, ${counts["MEDIUM"] || 0} medium`;

  const completed = await prisma.scan.update({
    where: { id: scan.id },
    data: { status: "COMPLETED", completedAt: new Date(), summary }
  });

  await prisma.project.update({ where: { id: projectId }, data: { status: "READY" } });
  await event(projectId, "scan", summary, counts);

  return completed;
}

/* ───────────────────────── Fix Synthesizer ──────────────────────── */
export async function generateFixForFinding(findingId: string, opts?: { iteration?: number; previousIssue?: string }) {
  const finding = await prisma.finding.findUnique({
    where: { id: findingId },
    include: { file: true }
  });
  if (!finding) throw new Error("Finding not found");
  if (!finding.file) throw new Error("Source file missing for finding");

  const run = await startAgentRun(finding.projectId, "fix-synthesizer", `Synthesising patch for ${finding.title}`);
  const baseIteration = opts?.iteration ?? 1;

  type AttemptResult =
    | { ok: true; rationale: string; before: string; after: string; patched: string }
    | { ok: false; reason: string };

  /**
   * One Fix Synthesizer turn. Returns either a fully-validated patch or a
   * machine-friendly description of what went wrong, suitable for feeding
   * back to the model as `prevAttemptIssue` on a follow-up attempt.
   */
  const attempt = async (iteration: number, prevIssue?: string): Promise<AttemptResult> => {
    const ai = await aiCompleteResilient(
      {
        model: MODEL_FIX_SYNTHESIZER,
        json: true,
        // before/after only — no fullFile echo. Keeps responses small + reliable.
        maxTokens: 2048,
        // Slightly higher temperature on the retry so the model doesn't repeat
        // the same degenerate answer it gave on attempt 1.
        temperature: prevIssue ? 0.5 : 0.1,
        messages: [
          { role: "system", content: SYSTEM_BASE },
          {
            role: "user",
            content: generateFixPrompt({
              filePath: finding.filePath,
              language: finding.file!.language ?? undefined,
              fullFile: finding.file!.content,
              finding: {
                title: finding.title,
                description: finding.description,
                line: finding.line ?? undefined,
                snippet: finding.snippet ?? undefined,
                category: finding.category
              },
              iteration,
              prevAttemptIssue: prevIssue
            })
          }
        ]
      },
      { timeoutMs: 75_000, maxAttempts: 2 }
    );

    const parsed = extractJSON<{
      rationale?: string;
      before?: string;
      after?: string;
      fullFile?: string;
      notes?: string;
    }>(ai.content);

    if (!parsed) {
      console.error("[fix-synthesizer] unparseable AI response:", ai.content?.slice(0, 500));
      return { ok: false, reason: "Your previous response could not be parsed as JSON. Respond with exactly one JSON object containing rationale, before, after, notes — no markdown fences, no extra prose." };
    }

    const rationale = (parsed.rationale ?? "").trim();
    const before = parsed.before ?? "";
    const after = parsed.after ?? "";

    if (!rationale) {
      return { ok: false, reason: "Your previous response had an empty 'rationale'. Provide a clear 1-3 sentence explanation of why your patch fixes this vulnerability." };
    }
    if (!before.trim() || !after.trim()) {
      return { ok: false, reason: "Your previous response had an empty 'before' or 'after'. Both fields are required and must be non-empty strings." };
    }
    if (before === after) {
      return { ok: false, reason: "Your previous 'before' and 'after' blocks were identical (a no-op). Produce a real code change that mitigates the vulnerability — even if the finding looks like a false positive, add a small defensive guard or clarifying comment so 'after' differs from 'before'." };
    }

    // Reconstruct the patched file from before/after. If the model also sent
    // `fullFile` we still prefer deterministic server-side reconstruction —
    // it's the source of truth used by /api/fixes/[id]/apply.
    let patched = applyBeforeAfterPatch(finding.file!.content, before, after);

    if (!patched && parsed.fullFile && parsed.fullFile !== finding.file!.content) {
      patched = parsed.fullFile;
    }

    if (!patched || patched === finding.file!.content) {
      return { ok: false, reason: "Your previous 'before' block was not found verbatim in the file (or produced no change). Copy 'before' EXACTLY from the file shown above, preserving every space and newline, and make sure 'after' is different." };
    }

    return { ok: true, rationale, before, after, patched };
  };

  try {
    // Attempt 1 — normal call, possibly seeded with caller-provided previousIssue.
    let result = await attempt(baseIteration, opts?.previousIssue);

    // Attempt 2 — retry once with self-feedback when the first turn produced
    // a degenerate/invalid patch. Transient *network* errors are already
    // handled inside aiCompleteResilient, so this retry is purely for
    // semantic problems with the model's output.
    if (!result.ok) {
      console.warn("[fix-synthesizer] attempt 1 degenerate:", result.reason);
      result = await attempt(baseIteration + 1, result.reason);
    }

    if (!result.ok) {
      throw new Error(result.reason.replace(/^Your previous /, "AI ").replace(/\.$/, "") + ". Try regenerating.");
    }

    const fix = await prisma.fix.create({
      data: {
        findingId: finding.id,
        agent: "fix-synthesizer",
        rationale: result.rationale,
        patch: result.patched,
        before: result.before,
        after: result.after,
        iteration: baseIteration
      }
    });

    await finishAgentRun(run.id, "completed", `Patch ready (iteration ${baseIteration})`);
    await event(finding.projectId, "fix", `Patch suggested for ${finding.title} (#${fix.id.slice(0, 6)})`);

    return fix;
  } catch (err: any) {
    const message = err?.name === "AbortError"
      ? "AI request timed out. Try again."
      : err?.message ?? "Fix generation failed";
    await finishAgentRun(run.id, "failed", message);
    throw err instanceof Error ? err : new Error(message);
  }
}

export async function applyFix(fixId: string) {
  const fix = await prisma.fix.findUnique({ where: { id: fixId }, include: { finding: { include: { file: true } } } });
  if (!fix) throw new Error("Fix not found");
  if (!fix.finding.file) throw new Error("Source file missing");

  await prisma.sourceFile.update({
    where: { id: fix.finding.file.id },
    data: { content: fix.patch, updatedAt: new Date() }
  });

  await prisma.fix.update({ where: { id: fix.id }, data: { applied: true, appliedAt: new Date() } });
  await prisma.finding.update({
    where: { id: fix.finding.id },
    data: { status: "FIXED", updatedAt: new Date() }
  });

  await event(fix.finding.projectId, "fix-applied", `Fix applied to ${fix.finding.filePath}`);

  return fix;
}

/* ───────────────────────── Explanation (per-finding) ────────────── */
export async function explainFinding(findingId: string) {
  const finding = await prisma.finding.findUnique({ where: { id: findingId }, include: { file: true } });
  if (!finding) throw new Error("Finding not found");

  const ai = await aiComplete({
    model: modelForAgent(finding.agent),
    json: true,
    messages: [
      { role: "system", content: SYSTEM_BASE },
      {
        role: "user",
        content: explainFindingPrompt({
          category: finding.category,
          filePath: finding.filePath,
          language: finding.file?.language ?? undefined,
          snippet: finding.snippet ?? finding.description
        })
      }
    ]
  });
  return extractJSON<{
    title: string;
    rootCause: string;
    impact: string;
    exploit: string;
    remediationStrategy: string;
    cwe?: string;
  }>(ai.content);
}

/* ───────────────────────── Report Composer ──────────────────────── */
export async function composeReport(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error("Project not found");

  const findings = await prisma.finding.findMany({ where: { projectId } });
  const fixes = await prisma.fix.count({ where: { finding: { projectId }, applied: true } });

  const totals: Record<string, number> = {};
  for (const f of findings) {
    totals[f.severity] = (totals[f.severity] || 0) + 1;
    totals[`category:${f.category}`] = (totals[`category:${f.category}`] || 0) + 1;
  }
  totals["total"] = findings.length;
  totals["appliedFixes"] = fixes;

  const top = findings
    .sort(
      (a, b) =>
        ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"].indexOf(a.severity) -
        ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"].indexOf(b.severity)
    )
    .slice(0, 8)
    .map((f) => ({ title: f.title, severity: f.severity, filePath: f.filePath, category: f.category }));

  const run = await startAgentRun(projectId, "report-composer", "Authoring executive report");

  const ai = await aiComplete({
    model: MODEL_REASONING,
    json: true,
    messages: [
      { role: "system", content: SYSTEM_BASE },
      {
        role: "user",
        content: reportSummaryPrompt({
          projectName: project.name,
          totals,
          topFindings: top,
          fixes
        })
      }
    ]
  });
  const parsed = extractJSON<{ title: string; summary: string; markdown: string }>(ai.content);

  const report = await prisma.report.create({
    data: {
      projectId,
      title: parsed?.title ?? `${project.name} — Security Report`,
      summary: parsed?.summary ?? "Automated security analysis report.",
      markdown: parsed?.markdown ?? buildFallbackMarkdown(project.name, totals, top, fixes),
      totals: JSON.stringify(totals)
    }
  });

  await finishAgentRun(run.id, "completed", "Report composed", { reportId: report.id });
  await event(projectId, "report", "Security report generated");
  return report;
}

function buildFallbackMarkdown(
  name: string,
  totals: Record<string, number>,
  top: { title: string; severity: string; filePath: string }[],
  fixes: number
) {
  const lines = [
    `# ${name} — Security Report`,
    ``,
    `## Overview`,
    `ZEROGATE's agent swarm scanned **${name}** and identified **${totals.total ?? 0}** issue(s) across the codebase. ${fixes} fix(es) were applied automatically.`,
    ``,
    `## Severity Distribution`,
    `- Critical: ${totals.CRITICAL ?? 0}`,
    `- High: ${totals.HIGH ?? 0}`,
    `- Medium: ${totals.MEDIUM ?? 0}`,
    `- Low: ${totals.LOW ?? 0}`,
    ``,
    `## Top Findings`,
    ...top.map((t) => `- **${t.severity}** — ${t.title} _(in \`${t.filePath}\`)_`),
    ``,
    `## Recommendations`,
    `Address Critical/High items first, rotate any leaked credentials, and add regression tests around the patched modules.`
  ];
  return lines.join("\n");
}
