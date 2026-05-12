import { NextResponse } from "next/server";
import { requireUser, getPlan } from "@/lib/session";
import { PLAN_LIMITS } from "@/lib/plans";
import { prisma } from "@/lib/db";
import { importFromZip } from "@/lib/agents/importer";
import { runCartographer } from "@/lib/agents/orchestrator";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

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

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const name = (form.get("name") as string) || file?.name?.replace(/\.zip$/i, "") || "Imported project";

    if (!file) {
      return NextResponse.json({ error: "Missing zip file" }, { status: 400 });
    }
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > limits.maxRepoSizeMB) {
      return NextResponse.json(
        { error: `Plan ${plan} allows ZIPs up to ${limits.maxRepoSizeMB} MB. Upload was ${sizeMB.toFixed(1)} MB.` },
        { status: 402 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const project = await importFromZip({ userId: user.id, plan, buffer, name });

    runCartographer(project.id).catch((e) => console.error("cartographer error", e));

    return NextResponse.json({ project });
  } catch (err: any) {
    console.error("POST /api/upload", err);
    return NextResponse.json({ error: err.message ?? "Upload failed" }, { status: 500 });
  }
}
