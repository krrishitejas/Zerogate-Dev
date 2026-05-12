import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { listUserRepos, octokitFor, searchPublicRepos } from "@/lib/github";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const url = new URL(req.url);
    const q = url.searchParams.get("q");

    const octokit = octokitFor(user.githubToken ?? undefined);
    if (q) {
      const items = await searchPublicRepos(octokit, q);
      return NextResponse.json({ items });
    }

    if (!user.githubToken) {
      return NextResponse.json(
        { items: [], error: "Connect GitHub from Settings to list your repositories." },
        { status: 200 }
      );
    }
    const items = await listUserRepos(octokit);
    return NextResponse.json({ items });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
