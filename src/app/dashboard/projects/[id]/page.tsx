import { notFound, redirect } from "next/navigation";
import { getCurrentUser, getPlan } from "@/lib/session";
import { prisma } from "@/lib/db";
import { PLAN_LIMITS } from "@/lib/plans";
import { ProjectView } from "@/components/dashboard/project-view";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  const project = await prisma.project.findFirst({
    where: { id: params.id, userId: user.id }
  });
  if (!project) notFound();

  const findings = await prisma.finding.findMany({
    where: { projectId: project.id },
    orderBy: [{ severity: "asc" }, { filePath: "asc" }],
    include: { fixes: { orderBy: { createdAt: "desc" }, take: 1 } }
  });
  const agentRuns = await prisma.agentRun.findMany({
    where: { projectId: project.id },
    orderBy: { startedAt: "desc" },
    take: 30
  });
  const events = await prisma.projectEvent.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: "desc" },
    take: 30
  });
  const reports = await prisma.report.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: "desc" }
  });

  const plan = getPlan(user);

  return (
    <ProjectView
      initialProject={{
        id: project.id,
        name: project.name,
        status: project.status,
        source: project.source,
        repoUrl: project.repoUrl,
        fileCount: project.fileCount,
        totalLOC: project.totalLOC,
        defaultBranch: project.defaultBranch,
        updatedAt: project.updatedAt.toISOString()
      }}
      initialFindings={findings.map((f) => ({
        id: f.id,
        severity: f.severity as any,
        category: f.category,
        title: f.title,
        description: f.description,
        filePath: f.filePath,
        line: f.line,
        agent: f.agent,
        status: f.status,
        cwe: f.cwe,
        snippet: f.snippet,
        confidence: f.confidence,
        fixes: f.fixes.map((x) => ({
          id: x.id,
          rationale: x.rationale,
          before: x.before,
          after: x.after,
          patch: x.patch,
          applied: x.applied,
          iteration: x.iteration
        }))
      }))}
      initialAgentRuns={agentRuns.map((r) => ({
        id: r.id,
        agent: r.agent,
        status: r.status,
        message: r.message,
        startedAt: r.startedAt.toISOString(),
        completedAt: r.completedAt?.toISOString() ?? null
      }))}
      initialEvents={events.map((e) => ({
        id: e.id,
        kind: e.kind,
        message: e.message,
        createdAt: e.createdAt.toISOString()
      }))}
      initialReports={reports.map((r) => ({
        id: r.id,
        title: r.title,
        summary: r.summary,
        markdown: r.markdown,
        createdAt: r.createdAt.toISOString()
      }))}
      pushEnabled={PLAN_LIMITS[plan].pushToGithub && !!user.githubToken}
    />
  );
}
