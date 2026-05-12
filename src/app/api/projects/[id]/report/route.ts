import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { composeReport } from "@/lib/agents/orchestrator";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const project = await prisma.project.findFirst({ where: { id: params.id, userId: user.id } });
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const report = await composeReport(project.id);
    return NextResponse.json({ report });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
