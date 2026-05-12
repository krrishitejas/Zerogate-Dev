import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { generateFixForFinding } from "@/lib/agents/orchestrator";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Generate (or regenerate) a fix for a finding. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const finding = await prisma.finding.findFirst({
      where: { id: params.id, project: { userId: user.id } }
    });
    if (!finding) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const { regenerate, previousIssue } = body as { regenerate?: boolean; previousIssue?: string };

    const existing = await prisma.fix.count({ where: { findingId: finding.id } });
    const iteration = (regenerate ? existing : 0) + 1;

    const fix = await generateFixForFinding(finding.id, { iteration, previousIssue });
    return NextResponse.json({ fix });
  } catch (err: any) {
    console.error("fix error", err);
    return NextResponse.json({ error: err.message ?? "Fix generation failed" }, { status: 500 });
  }
}
