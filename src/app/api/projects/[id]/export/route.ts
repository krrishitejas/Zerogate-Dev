import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { buildFindingsCSV, buildFindingsXLSX, buildProjectZip } from "@/lib/agents/exporter";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const project = await prisma.project.findFirst({ where: { id: params.id, userId: user.id } });
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const url = new URL(req.url);
    const format = (url.searchParams.get("format") || "csv").toLowerCase();
    const safeName = project.name.replace(/[^A-Za-z0-9._-]/g, "-");

    if (format === "csv") {
      const csv = await buildFindingsCSV(project.id);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${safeName}-findings.csv"`
        }
      });
    }

    if (format === "xlsx") {
      const buffer = await buildFindingsXLSX(project.id);
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${safeName}-findings.xlsx"`
        }
      });
    }

    if (format === "zip") {
      const buffer = await buildProjectZip(project.id);
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${safeName}.zip"`
        }
      });
    }

    return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
