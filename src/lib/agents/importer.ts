import { prisma } from "@/lib/db";
import { detectLanguage, isHidden, countLOC } from "@/lib/language";
import { fetchRepoTree, octokitFor, parseRepoUrl, forkRepo, type RemoteFile } from "@/lib/github";
import JSZip from "jszip";
import { PLAN_LIMITS } from "@/lib/plans";
import type { Plan } from "@/types/zg";

async function event(projectId: string, kind: string, message: string, meta?: any) {
  await prisma.projectEvent.create({
    data: { projectId, kind, message, meta: meta ? JSON.stringify(meta) : null }
  });
}

async function startAgentRun(projectId: string, agent: string, message?: string) {
  return prisma.agentRun.create({ data: { projectId, agent, message: message ?? null, status: "running" } });
}
async function finishAgentRun(id: string, status: "completed" | "failed", message?: string, meta?: any) {
  await prisma.agentRun.update({
    where: { id },
    data: { status, completedAt: new Date(), message: message ?? undefined, meta: meta ? JSON.stringify(meta) : undefined }
  });
}

function applyPlanLimits(files: RemoteFile[], plan: Plan): RemoteFile[] {
  const limits = PLAN_LIMITS[plan];
  return files.slice(0, limits.maxFilesPerProject);
}

/**
 * Import a GitHub repo into a Project. Plan limits are applied.
 * If `fork` is true, the repo is forked into the user's account first (PRO+).
 */
export async function importFromGithub(args: {
  userId: string;
  plan: Plan;
  repoUrl: string;
  token?: string | null;
  fork?: boolean;
  ref?: string;
  name?: string;
}) {
  const ident = parseRepoUrl(args.repoUrl);
  if (!ident) throw new Error("Invalid GitHub repository (use owner/repo or full URL)");

  const project = await prisma.project.create({
    data: {
      userId: args.userId,
      name: args.name || `${ident.owner}/${ident.repo}`,
      source: args.fork ? "FORK" : "GITHUB",
      repoUrl: `https://github.com/${ident.owner}/${ident.repo}`,
      repoOwner: ident.owner,
      repoName: ident.repo,
      status: "IMPORTING"
    }
  });

  const run = await startAgentRun(project.id, "repo-importer", `Importing ${ident.owner}/${ident.repo}`);

  try {
    let owner = ident.owner;
    let repo = ident.repo;

    const octokit = octokitFor(args.token);

    if (args.fork) {
      const forked = await forkRepo(octokit, ident.owner, ident.repo);
      const [fOwner, fRepo] = forked.full_name.split("/");
      owner = fOwner;
      repo = fRepo;
      await event(project.id, "fork", `Forked to ${forked.full_name}`);
    }

    const { files, defaultBranch } = await fetchRepoTree({
      octokit,
      owner,
      repo,
      ref: args.ref,
      maxFiles: PLAN_LIMITS[args.plan].maxFilesPerProject
    });

    const limited = applyPlanLimits(files, args.plan);
    let totalLOC = 0;
    for (const f of limited) {
      const lang = detectLanguage(f.path);
      const loc = countLOC(f.content);
      totalLOC += loc;
      await prisma.sourceFile.create({
        data: {
          projectId: project.id,
          path: f.path,
          language: lang,
          size: f.size,
          loc,
          hash: f.sha,
          content: f.content,
          isHidden: isHidden(f.path)
        }
      });
    }

    const updated = await prisma.project.update({
      where: { id: project.id },
      data: {
        status: "ANALYZING",
        fileCount: limited.length,
        totalLOC,
        defaultBranch,
        repoOwner: owner,
        repoName: repo,
        repoUrl: `https://github.com/${owner}/${repo}`
      }
    });

    await finishAgentRun(run.id, "completed", `Imported ${limited.length} files`, {
      files: limited.length,
      loc: totalLOC,
      defaultBranch
    });
    await event(project.id, "import", `Imported ${limited.length} files from ${owner}/${repo}`);
    return updated;
  } catch (err: any) {
    await finishAgentRun(run.id, "failed", err?.message ?? "import failed");
    await prisma.project.update({ where: { id: project.id }, data: { status: "ERROR" } });
    throw err;
  }
}

/* ───────────────────────── ZIP import ────────────────────────── */
export async function importFromZip(args: {
  userId: string;
  plan: Plan;
  buffer: ArrayBuffer | Buffer;
  name: string;
}) {
  const project = await prisma.project.create({
    data: {
      userId: args.userId,
      name: args.name,
      source: "ZIP",
      status: "IMPORTING"
    }
  });

  const run = await startAgentRun(project.id, "repo-importer", `Unpacking ${args.name}`);

  try {
    const zip = await JSZip.loadAsync(args.buffer as any);

    const entries = Object.values(zip.files).filter((f) => !f.dir);
    const limit = PLAN_LIMITS[args.plan].maxFilesPerProject;

    let count = 0;
    let totalLOC = 0;

    for (const entry of entries) {
      if (count >= limit) break;
      // Reject huge files
      const _data: Uint8Array = await entry.async("uint8array");
      if (_data.byteLength > 800_000) continue;

      // Skip clearly binary by extension
      const path = entry.name.replace(/^\/+/, "");
      const ext = path.split(".").pop()?.toLowerCase() ?? "";
      const BINARY_EXTS = new Set(["png","jpg","jpeg","gif","webp","ico","pdf","zip","tar","gz","mp3","mp4","mov","avi","ttf","otf","woff","woff2","class","jar","exe","dll","so","dylib"]);
      if (BINARY_EXTS.has(ext)) continue;

      // Skip ignored dirs
      if (path.split("/").some((p) => ["node_modules","__pycache__",".git",".next","dist","build","vendor","venv",".venv","target"].includes(p))) continue;

      const content = new TextDecoder("utf-8", { fatal: false }).decode(_data);
      const lang = detectLanguage(path);
      const loc = countLOC(content);
      totalLOC += loc;
      try {
        await prisma.sourceFile.create({
          data: {
            projectId: project.id,
            path,
            language: lang,
            size: _data.byteLength,
            loc,
            content,
            isHidden: isHidden(path)
          }
        });
        count++;
      } catch {
        // duplicate path within zip — ignore
      }
    }

    const updated = await prisma.project.update({
      where: { id: project.id },
      data: { status: "ANALYZING", fileCount: count, totalLOC }
    });

    await finishAgentRun(run.id, "completed", `Unpacked ${count} files`, { files: count, loc: totalLOC });
    await event(project.id, "import", `Imported ${count} files from ZIP`);
    return updated;
  } catch (err: any) {
    await finishAgentRun(run.id, "failed", err?.message ?? "zip import failed");
    await prisma.project.update({ where: { id: project.id }, data: { status: "ERROR" } });
    throw err;
  }
}
