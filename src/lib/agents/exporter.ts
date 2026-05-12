import { prisma } from "@/lib/db";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { commitFileUpdate, octokitFor, parseRepoUrl } from "@/lib/github";

/* ───────────────────────── CSV ──────────────────────────────────── */
function csvField(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function buildFindingsCSV(projectId: string): Promise<string> {
  const rows = await prisma.finding.findMany({
    where: { projectId },
    orderBy: [{ severity: "asc" }, { filePath: "asc" }]
  });

  const header = [
    "id","severity","category","cwe","title","filePath","line",
    "agent","status","confidence","createdAt","description"
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.id, r.severity, r.category, r.cwe ?? "", r.title, r.filePath, r.line ?? "",
        r.agent, r.status, r.confidence, r.createdAt.toISOString(), r.description
      ].map(csvField).join(",")
    );
  }
  return lines.join("\n");
}

/* ───────────────────────── XLSX ─────────────────────────────────── */
export async function buildFindingsXLSX(projectId: string): Promise<Buffer> {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  const findings = await prisma.finding.findMany({
    where: { projectId },
    orderBy: [{ severity: "asc" }, { filePath: "asc" }]
  });
  const fixes = await prisma.fix.findMany({ where: { finding: { projectId } } });

  const wb = new ExcelJS.Workbook();
  wb.creator = "ZEROGATE";
  wb.created = new Date();

  // Summary
  const summary = wb.addWorksheet("Summary");
  summary.columns = [
    { header: "Metric", key: "metric", width: 30 },
    { header: "Value", key: "value", width: 50 }
  ];
  const totals: Record<string, number> = {};
  for (const f of findings) totals[f.severity] = (totals[f.severity] || 0) + 1;
  summary.addRows([
    { metric: "Project", value: project?.name ?? "" },
    { metric: "Source", value: project?.source ?? "" },
    { metric: "Repository", value: project?.repoUrl ?? "—" },
    { metric: "Files", value: project?.fileCount ?? 0 },
    { metric: "Total LOC", value: project?.totalLOC ?? 0 },
    { metric: "Total Findings", value: findings.length },
    { metric: "Critical", value: totals.CRITICAL ?? 0 },
    { metric: "High", value: totals.HIGH ?? 0 },
    { metric: "Medium", value: totals.MEDIUM ?? 0 },
    { metric: "Low", value: totals.LOW ?? 0 },
    { metric: "Fixes Applied", value: fixes.filter((f) => f.applied).length }
  ]);
  summary.getRow(1).font = { bold: true };

  // Findings
  const ws = wb.addWorksheet("Findings");
  ws.columns = [
    { header: "Severity",   key: "severity",   width: 12 },
    { header: "Category",   key: "category",   width: 14 },
    { header: "CWE",        key: "cwe",        width: 12 },
    { header: "Title",      key: "title",      width: 50 },
    { header: "File",       key: "filePath",   width: 50 },
    { header: "Line",       key: "line",       width: 8  },
    { header: "Agent",      key: "agent",      width: 22 },
    { header: "Status",     key: "status",     width: 12 },
    { header: "Confidence", key: "confidence", width: 12 },
    { header: "Description",key: "description",width: 80 }
  ];
  ws.addRows(
    findings.map((f) => ({
      severity: f.severity,
      category: f.category,
      cwe: f.cwe ?? "",
      title: f.title,
      filePath: f.filePath,
      line: f.line ?? "",
      agent: f.agent,
      status: f.status,
      confidence: f.confidence,
      description: f.description
    }))
  );
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = {
    type: "pattern", pattern: "solid", fgColor: { argb: "FF1F1B3A" }
  };
  ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  ws.eachRow((row, idx) => {
    if (idx === 1) return;
    const sev = row.getCell("severity").value as string;
    const color =
      sev === "CRITICAL" ? "FFB91C1C"
      : sev === "HIGH"   ? "FFB45309"
      : sev === "MEDIUM" ? "FFA16207"
      : sev === "LOW"    ? "FF1D4ED8"
                         : "FF334155";
    row.getCell("severity").fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
    row.getCell("severity").font = { color: { argb: "FFFFFFFF" }, bold: true };
  });

  // Fixes
  const fxs = wb.addWorksheet("Fixes");
  fxs.columns = [
    { header: "Finding ID", key: "fid", width: 28 },
    { header: "Iteration",  key: "it",  width: 10 },
    { header: "Applied",    key: "ap",  width: 10 },
    { header: "Rationale",  key: "r",   width: 80 }
  ];
  fxs.addRows(
    fixes.map((f) => ({
      fid: f.findingId, it: f.iteration, ap: f.applied ? "yes" : "no", r: f.rationale
    }))
  );
  fxs.getRow(1).font = { bold: true };

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf as ArrayBuffer);
}

/* ───────────────────────── Project ZIP ────────────────────────── */
export async function buildProjectZip(projectId: string): Promise<Buffer> {
  const files = await prisma.sourceFile.findMany({ where: { projectId } });
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  const zip = new JSZip();
  const root = (project?.name || "zerogate-export").replace(/[^A-Za-z0-9._-]/g, "-");
  const folder = zip.folder(root)!;
  for (const f of files) {
    folder.file(f.path, f.content);
  }
  const out = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  return out as Buffer;
}

/* ───────────────────────── Push to GitHub ───────────────────────── */
export async function pushFixesToGithub(args: {
  projectId: string;
  token: string;
  branch?: string;
  commitMessage?: string;
}) {
  const project = await prisma.project.findUnique({ where: { id: args.projectId } });
  if (!project) throw new Error("Project not found");
  if (!project.repoUrl) throw new Error("Project has no repository url");
  const ident = parseRepoUrl(project.repoUrl);
  if (!ident) throw new Error("Project repository url is invalid");

  const branch = args.branch || `zerogate/fix-${Date.now().toString(36)}`;
  const message = args.commitMessage || "chore(zerogate): apply automated security fixes";
  const octokit = octokitFor(args.token);

  const fixes = await prisma.fix.findMany({
    where: { applied: true, finding: { projectId: project.id } },
    include: { finding: { include: { file: true } } }
  });

  const uniqueFiles = new Map<string, string>();
  for (const f of fixes) {
    if (f.finding.file) uniqueFiles.set(f.finding.file.path, f.finding.file.content);
  }

  for (const [path, content] of uniqueFiles) {
    await commitFileUpdate({
      octokit,
      owner: ident.owner,
      repo: ident.repo,
      branch,
      path,
      content,
      message: `${message}\n\nfile: ${path}`
    });
  }

  return { branch, files: uniqueFiles.size, repo: `${ident.owner}/${ident.repo}` };
}
