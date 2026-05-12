import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, getPlan } from "@/lib/session";
import { prisma } from "@/lib/db";
import { PLAN_LIMITS } from "@/lib/plans";
import { importFromGithub } from "@/lib/agents/importer";
import { runCartographer } from "@/lib/agents/orchestrator";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" }
    });
    return NextResponse.json({ projects });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

const githubSchema = z.object({
  source: z.literal("github").default("github"),
  repoUrl: z.string().min(3),
  fork: z.boolean().optional(),
  ref: z.string().optional(),
  name: z.string().optional()
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const plan = getPlan(user);
    const limits = PLAN_LIMITS[plan];

    const count = await prisma.project.count({ where: { userId: user.id } });
    if (count >= limits.maxProjects) {
      return NextResponse.json(
        { error: `Plan ${plan} allows ${limits.maxProjects} projects. Upgrade for more.` },
        { status: 402 }
      );
    }

    const body = await req.json();
    const parsed = githubSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const project = await importFromGithub({
      userId: user.id,
      plan,
      repoUrl: parsed.data.repoUrl,
      token: user.githubToken ?? undefined,
      fork: parsed.data.fork,
      ref: parsed.data.ref,
      name: parsed.data.name
    });

    // Best-effort RAG cartograph (offline-safe)
    runCartographer(project.id).catch((e) => console.error("cartographer error", e));

    return NextResponse.json({ project });
  } catch (err: any) {
    console.error("POST /api/projects", err);
    return NextResponse.json({ error: err.message ?? "Failed to import" }, { status: 500 });
  }
}
