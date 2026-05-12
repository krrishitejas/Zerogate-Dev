import { Octokit } from "@octokit/rest";

export type RepoIdentifier = { owner: string; repo: string };

export function parseRepoUrl(url: string): RepoIdentifier | null {
  if (!url) return null;
  // accept "owner/repo", full URL, or git@github.com:owner/repo.git
  const cleaned = url.trim().replace(/\.git$/, "");
  const m =
    cleaned.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/?$/) ||
    cleaned.match(/^git@github\.com:([^/]+)\/([^/]+)$/) ||
    cleaned.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (!m) return null;
  return { owner: m[1], repo: m[2] };
}

export function octokitFor(token?: string | null) {
  return new Octokit({ auth: token || process.env.GITHUB_DEFAULT_TOKEN || undefined });
}

export type RemoteFile = {
  path: string;
  content: string;
  size: number;
  sha?: string;
};

const TEXT_EXT = new Set([
  "ts","tsx","js","jsx","mjs","cjs","py","rb","php","java","kt","scala","groovy",
  "go","rs","c","h","cpp","cc","cxx","hpp","cs","fs","swift","m","mm","sh","bash","zsh",
  "yml","yaml","json","toml","ini","env","html","htm","vue","svelte","css","scss","sass",
  "less","md","mdx","sql","graphql","gql","tf","hcl","xml","conf","cfg","properties",
  "dockerfile","makefile","procfile","gitignore","gitattributes","editorconfig","prettierrc","eslintrc"
]);

function isTextFile(path: string, size: number): boolean {
  if (size > 800_000) return false;
  const file = path.split("/").pop() || path;
  if (file === "Dockerfile" || file === "Makefile") return true;
  const ext = file.includes(".") ? file.split(".").pop()!.toLowerCase() : "";
  return TEXT_EXT.has(ext);
}

const SKIP_DIR = new Set([
  "node_modules", ".git", ".next", "dist", "build", "out", "coverage", ".cache",
  "vendor", "venv", ".venv", "__pycache__", "target"
]);

export async function fetchRepoTree(args: {
  octokit: Octokit;
  owner: string;
  repo: string;
  ref?: string;
  maxFiles?: number;
}): Promise<{ files: RemoteFile[]; defaultBranch: string }> {
  const { octokit, owner, repo, maxFiles = 1500 } = args;

  const repoInfo = await octokit.repos.get({ owner, repo });
  const ref = args.ref || repoInfo.data.default_branch;

  const branch = await octokit.repos.getBranch({ owner, repo, branch: ref });
  const treeSha = branch.data.commit.commit.tree.sha;

  const tree = await octokit.git.getTree({ owner, repo, tree_sha: treeSha, recursive: "true" });

  const blobs = (tree.data.tree || []).filter((t) => t.type === "blob");
  const files: RemoteFile[] = [];
  let count = 0;

  for (const blob of blobs) {
    if (count >= maxFiles) break;
    const path = blob.path || "";
    const size = blob.size || 0;
    if (path.split("/").some((p) => SKIP_DIR.has(p))) continue;
    if (!isTextFile(path, size)) continue;

    try {
      const content = await octokit.repos.getContent({ owner, repo, path, ref });
      const data = content.data as any;
      if (data && data.content && data.encoding === "base64") {
        const text = Buffer.from(data.content, "base64").toString("utf-8");
        files.push({ path, content: text, size, sha: blob.sha });
        count++;
      }
    } catch {
      // skip files we can't access
    }
  }

  return { files, defaultBranch: repoInfo.data.default_branch };
}

export async function listUserRepos(octokit: Octokit, perPage = 30) {
  const res = await octokit.repos.listForAuthenticatedUser({
    per_page: perPage,
    sort: "updated"
  });
  return res.data.map((r) => ({
    id: r.id,
    full_name: r.full_name,
    name: r.name,
    owner: r.owner.login,
    private: r.private,
    description: r.description,
    default_branch: r.default_branch,
    language: r.language,
    stars: r.stargazers_count,
    updated_at: r.updated_at
  }));
}

export async function searchPublicRepos(octokit: Octokit, q: string, perPage = 12) {
  const res = await octokit.search.repos({ q, per_page: perPage });
  return res.data.items.map((r) => ({
    id: r.id,
    full_name: r.full_name,
    name: r.name,
    owner: r.owner?.login,
    private: r.private,
    description: r.description,
    default_branch: r.default_branch,
    language: r.language,
    stars: r.stargazers_count,
    updated_at: r.updated_at
  }));
}

/** Fork a repo to the authenticated user's account. Used by the “collaborate / fork” flow. */
export async function forkRepo(octokit: Octokit, owner: string, repo: string) {
  const res = await octokit.repos.createFork({ owner, repo });
  return { full_name: res.data.full_name, default_branch: res.data.default_branch };
}

/** Push a single file change to a branch (creates it if necessary). */
export async function commitFileUpdate(args: {
  octokit: Octokit;
  owner: string;
  repo: string;
  branch: string;
  path: string;
  content: string;
  message: string;
}) {
  const { octokit, owner, repo, branch, path, content, message } = args;

  // Make sure the branch exists. Create it from default if not.
  let branchSha: string | null = null;
  try {
    const b = await octokit.repos.getBranch({ owner, repo, branch });
    branchSha = b.data.commit.sha;
  } catch {
    const repoInfo = await octokit.repos.get({ owner, repo });
    const base = await octokit.repos.getBranch({ owner, repo, branch: repoInfo.data.default_branch });
    await octokit.git.createRef({ owner, repo, ref: `refs/heads/${branch}`, sha: base.data.commit.sha });
    branchSha = base.data.commit.sha;
  }

  // Check if file exists to fetch its sha
  let sha: string | undefined;
  try {
    const existing = await octokit.repos.getContent({ owner, repo, path, ref: branch });
    if (!Array.isArray(existing.data) && (existing.data as any).sha) {
      sha = (existing.data as any).sha;
    }
  } catch {
    // new file
  }

  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    branch,
    message,
    content: Buffer.from(content, "utf-8").toString("base64"),
    sha
  });
}
