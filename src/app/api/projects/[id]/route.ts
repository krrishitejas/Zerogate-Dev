import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

async function ownedProject(userId: string, id: string) {
  const project = await prisma.project.findFirst({ where: { id, userId } });
  if (!project) throw new Error("NOT_FOUND");
  return project;
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const project = await ownedProject(user.id, params.id);
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
    return NextResponse.json({ project, findings, agentRuns, events, reports });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.message === "NOT_FOUND" ? 404 : 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const project = await ownedProject(user.id, params.id);

    // Cascaded deletion — explicit for robustness
    await prisma.$transaction([
      prisma.fix.deleteMany({ where: { finding: { projectId: project.id } } }),
      prisma.finding.deleteMany({ where: { projectId: project.id } }),
      prisma.scan.deleteMany({ where: { projectId: project.id } }),
      prisma.report.deleteMany({ where: { projectId: project.id } }),
      prisma.agentRun.deleteMany({ where: { projectId: project.id } }),
      prisma.projectEvent.deleteMany({ where: { projectId: project.id } }),
      prisma.sourceFile.deleteMany({ where: { projectId: project.id } }),
      prisma.project.delete({ where: { id: project.id } })
    ]);

    return NextResponse.json({ ok: true, deleted: project.name });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.message === "NOT_FOUND" ? 404 : 500 });
  }
}
