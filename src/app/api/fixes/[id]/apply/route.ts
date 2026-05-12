import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { applyFix } from "@/lib/agents/orchestrator";

export const dynamic = "force-dynamic";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const fix = await prisma.fix.findFirst({
      where: { id: params.id, finding: { project: { userId: user.id } } }
    });
    if (!fix) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const applied = await applyFix(fix.id);
    return NextResponse.json({ fix: applied });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
