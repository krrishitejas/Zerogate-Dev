import { NextResponse } from "next/server";
import { requireUser, getPlan } from "@/lib/session";
import { prisma } from "@/lib/db";
import { PLAN_LIMITS } from "@/lib/plans";
import { pushFixesToGithub } from "@/lib/agents/exporter";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const plan = getPlan(user);
    if (!PLAN_LIMITS[plan].pushToGithub) {
      return NextResponse.json({ error: "Pushing to GitHub requires Pro or Max plan." }, { status: 402 });
    }
    if (!user.githubToken) {
      return NextResponse.json({ error: "Connect GitHub first to push fixes." }, { status: 412 });
    }
    const project = await prisma.project.findFirst({ where: { id: params.id, userId: user.id } });
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const out = await pushFixesToGithub({
      projectId: project.id,
      token: user.githubToken,
      branch: body.branch,
      commitMessage: body.commitMessage
    });

    await prisma.projectEvent.create({
      data: {
        projectId: project.id,
        kind: "push",
        message: `Pushed ${out.files} file(s) to ${out.repo} on branch ${out.branch}`
      }
    });

    return NextResponse.json(out);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
