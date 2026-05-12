import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const schema = z.object({ plan: z.enum(["FREE", "PRO", "MAX"]) });

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

    // For demo deployment we self-serve plan upgrades. In production, gate behind Stripe.
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { plan: parsed.data.plan }
    });
    return NextResponse.json({ plan: updated.plan });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
