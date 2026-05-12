import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { runVulnerabilityScan } from "@/lib/agents/orchestrator";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const project = await prisma.project.findFirst({ where: { id: params.id, userId: user.id } });
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Clear previous findings for a clean re-scan
    await prisma.finding.deleteMany({ where: { projectId: project.id } });
    const scan = await runVulnerabilityScan(project.id, user.email ?? user.id);
    return NextResponse.json({ scan });
  } catch (err: any) {
    console.error("scan error", err);
    return NextResponse.json({ error: err.message ?? "Scan failed" }, { status: 500 });
  }
}
