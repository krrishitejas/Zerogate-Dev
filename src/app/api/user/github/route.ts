import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const schema = z.object({
  token: z.string().min(20).max(200).optional().nullable()
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid token" }, { status: 400 });

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { githubToken: parsed.data.token ?? null }
    });
    return NextResponse.json({ ok: true, hasToken: !!updated.githubToken });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
