import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileSpreadsheet } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ReportDetailPage({
  params
}: {
  params: { id: string; rid: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  const report = await prisma.report.findFirst({
    where: { id: params.rid, project: { id: params.id, userId: user.id } }
  });
  if (!report) notFound();

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between gap-3">
        <Link href={`/dashboard/projects/${params.id}`} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to project
        </Link>
        <div className="flex gap-2">
          <a href={`/api/projects/${params.id}/export?format=csv`}>
            <Button variant="secondary" size="sm">
              <FileSpreadsheet className="h-4 w-4" /> CSV
            </Button>
          </a>
          <a href={`/api/projects/${params.id}/export?format=xlsx`}>
            <Button variant="secondary" size="sm">
              <FileSpreadsheet className="h-4 w-4" /> XLSX
            </Button>
          </a>
        </div>
      </div>

      <header className="card-cyber p-6">
        <h1 className="font-display text-2xl font-bold tracking-tight">{report.title}</h1>
        <p className="mt-2 text-muted-foreground">{report.summary}</p>
      </header>

      <article
        className="card-cyber p-7 prose prose-invert prose-sm md:prose-base max-w-none
                   prose-headings:font-display prose-headings:tracking-tight
                   prose-h1:text-3xl prose-h2:text-xl prose-h3:text-base
                   prose-p:text-foreground/85 prose-li:text-foreground/85
                   prose-code:text-cyan-200 prose-strong:text-foreground"
      >
        <pre className="whitespace-pre-wrap font-sans text-[0.95rem] leading-relaxed">{report.markdown}</pre>
      </article>
    </div>
  );
}
