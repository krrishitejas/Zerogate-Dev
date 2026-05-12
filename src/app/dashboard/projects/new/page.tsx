"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileArchive,
  Github,
  GitFork,
  Loader2,
  Search,
  Star,
  Upload,
  type LucideIcon
} from "lucide-react";

type Tab = "github" | "search" | "zip";

type RepoItem = {
  id: number;
  full_name: string;
  description: string | null;
  default_branch: string;
  language: string | null;
  stars: number;
  private: boolean;
  updated_at: string | null;
};

const TABS: { id: Tab; label: string; icon: LucideIcon; hint: string }[] = [
  { id: "github", label: "GitHub",  icon: Github,      hint: "Pick from your repos" },
  { id: "search", label: "Search",  icon: Search,      hint: "Fork an open-source project" },
  { id: "zip",    label: "Upload",  icon: FileArchive, hint: "Drag a ZIP archive" }
];

export default function NewProjectPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("github");

  return (
    <div className="space-y-10 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="font-display text-[36px] sm:text-[44px] leading-[1.05] tracking-tight text-cream">
          Connect a repo.{" "}
          <span className="italic text-amber-phosphor">Get a PR.</span>
        </h1>
        <p className="mt-2 font-reading text-[15px] leading-[1.55] text-cream-dim max-w-xl">
          We index your code, run the swarm, and open a pull request with the patch.
        </p>
      </div>

      {/* Source picker */}
      <div className="grid gap-3 sm:grid-cols-3">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`group border bg-ink-2 px-5 py-5 text-left transition-colors ${
                active
                  ? "border-amber-phosphor bg-ink-3"
                  : "border-rule hover:border-amber-phosphor/40"
              }`}
            >
              <div className={`flex h-10 w-10 items-center justify-center border bg-ink ${active ? "border-amber-phosphor/50 text-amber-phosphor" : "border-rule text-cream-dim group-hover:text-cream"} transition-colors`}>
                <t.icon className="h-4 w-4" strokeWidth={1.5} />
              </div>
              <div className={`mt-4 font-display text-[22px] italic ${active ? "text-amber-phosphor" : "text-cream"}`}>
                {t.label}.
              </div>
              <div className="mt-1 text-[12.5px] text-cream-faint">{t.hint}</div>
            </button>
          );
        })}
      </div>

      {tab === "github" && <GithubReposPanel onImported={(id) => router.push(`/dashboard/projects/${id}`)} />}
      {tab === "search" && <SearchPanel onImported={(id) => router.push(`/dashboard/projects/${id}`)} />}
      {tab === "zip"    && <ZipPanel onImported={(id) => router.push(`/dashboard/projects/${id}`)} />}
    </div>
  );
}

/* ───── GitHub ───── */
function GithubReposPanel({ onImported }: { onImported: (id: string) => void }) {
  const [repos, setRepos] = useState<RepoItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [manual, setManual] = useState("");

  useEffect(() => {
    fetch("/api/github/repos")
      .then((r) => r.json())
      .then((j) => {
        if (j.error) setError(j.error);
        setRepos(j.items ?? []);
      })
      .catch((e) => setError(e.message));
  }, []);

  async function importRepo(repoUrl: string, fork = false) {
    setBusy(repoUrl);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "github", repoUrl, fork })
      });
      const j = await res.json();
      if (!res.ok) throw new Error(typeof j.error === "string" ? j.error : "Import failed");
      toast.success(`Imported ${repoUrl}`);
      onImported(j.project.id);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Manual URL input */}
      <div className="border border-rule bg-ink-2 p-5">
        <div className="text-[13px] text-cream-dim">Paste a repo URL or owner/repo</div>
        <div className="mt-3 flex gap-2">
          <Input
            placeholder="acme/payments-api"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            className="bg-ink border-rule font-mono text-[13px]"
          />
          <Button
            disabled={!manual || !!busy}
            onClick={() => importRepo(manual)}
            className="font-mono uppercase tracking-widest text-xs"
          >
            {busy === manual ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Import"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="border border-rule bg-ink-2 p-5 text-[13.5px] text-cream-dim">
          {error}{" "}
          <span className="text-cream-faint">— sign in with GitHub for one-click access.</span>
        </div>
      )}

      {/* Repo list */}
      {!repos ? (
        <div className="border border-rule bg-ink-2 p-12 text-center">
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-amber-phosphor" strokeWidth={1.5} />
          <div className="mt-3 text-[12.5px] text-cream-faint">Fetching repositories…</div>
        </div>
      ) : repos.length === 0 ? (
        <div className="border border-rule bg-ink-2 p-10 text-center">
          <p className="text-[14px] text-cream-dim">
            No repositories found. Use the URL field above.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {repos.map((r) => (
            <div
              key={r.id}
              className="border border-rule bg-ink-2 p-5 hover:border-amber-phosphor/40 transition-colors flex flex-col"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] text-cream truncate">{r.full_name}</div>
                  <div className="mt-1 text-[13px] text-cream-dim line-clamp-2">
                    {r.description || "—"}
                  </div>
                </div>
                <span className={`chip shrink-0 ${r.private ? "chip-amber" : ""}`}>
                  {r.private ? "private" : "public"}
                </span>
              </div>
              <div className="mt-auto pt-4 flex items-center gap-3 text-[12px] text-cream-faint">
                {r.language && <span>{r.language}</span>}
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3 w-3" strokeWidth={1.5} /> {r.stars}
                </span>
                <span className="ml-auto">
                  <Button
                    size="sm"
                    onClick={() => importRepo(`https://github.com/${r.full_name}`)}
                    disabled={!!busy}
                    className="font-mono uppercase tracking-widest text-[10.5px]"
                  >
                    {busy === `https://github.com/${r.full_name}` ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      "Import"
                    )}
                  </Button>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───── Search & fork ───── */
function SearchPanel({ onImported }: { onImported: (id: string) => void }) {
  const [q, setQ] = useState("stars:>1000 language:typescript");
  const [items, setItems] = useState<RepoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  async function search() {
    setLoading(true);
    try {
      const res = await fetch(`/api/github/repos?q=${encodeURIComponent(q)}`);
      const j = await res.json();
      setItems(j.items ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function fork(repoUrl: string) {
    setBusy(repoUrl);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "github", repoUrl, fork: true })
      });
      const j = await res.json();
      if (!res.ok) throw new Error(typeof j.error === "string" ? j.error : "Fork failed");
      toast.success("Forked & imported");
      onImported(j.project.id);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="border border-rule bg-ink-2 p-5">
        <div className="text-[13px] text-cream-dim">Search public repositories</div>
        <div className="mt-3 flex gap-2">
          <Input
            placeholder="payments react owner:vercel..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            className="bg-ink border-rule font-mono text-[13px]"
          />
          <Button onClick={search} disabled={loading} className="font-mono uppercase tracking-widest text-xs">
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <Search className="h-3.5 w-3.5" strokeWidth={1.5} /> Search
              </>
            )}
          </Button>
        </div>
        <p className="mt-3 text-[12px] text-cream-faint">
          Forks land on your account — never the upstream.
        </p>
      </div>

      {items.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((r) => (
            <div
              key={r.id}
              className="border border-rule bg-ink-2 p-5 hover:border-amber-phosphor/40 transition-colors flex flex-col"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] text-cream truncate">{r.full_name}</div>
                  <div className="mt-1 text-[13px] text-cream-dim line-clamp-2">
                    {r.description || "—"}
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 shrink-0 text-[12px] text-cream-faint">
                  <Star className="h-3 w-3" strokeWidth={1.5} /> {r.stars}
                </span>
              </div>
              <div className="mt-auto pt-4 flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => fork(`https://github.com/${r.full_name}`)}
                  disabled={!!busy}
                  className="font-mono uppercase tracking-widest text-[10.5px]"
                >
                  <GitFork className="h-3 w-3" strokeWidth={1.5} /> Fork
                </Button>
                <Button
                  size="sm"
                  onClick={async () => {
                    setBusy(r.full_name);
                    try {
                      const res = await fetch("/api/projects", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          source: "github",
                          repoUrl: `https://github.com/${r.full_name}`
                        })
                      });
                      const j = await res.json();
                      if (!res.ok) throw new Error(typeof j.error === "string" ? j.error : "Import failed");
                      toast.success("Imported");
                      onImported(j.project.id);
                    } catch (err: any) {
                      toast.error(err.message);
                    } finally {
                      setBusy(null);
                    }
                  }}
                  disabled={!!busy}
                  className="font-mono uppercase tracking-widest text-[10.5px]"
                >
                  {busy === r.full_name ? <Loader2 className="h-3 w-3 animate-spin" /> : "Import"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───── ZIP ───── */
function ZipPanel({ onImported }: { onImported: (id: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function upload() {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (name) fd.append("name", name);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(typeof j.error === "string" ? j.error : "Upload failed");
      toast.success("Project uploaded");
      onImported(j.project.id);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-rule bg-ink-2 p-6 space-y-5">
      <div>
        <div className="text-[13px] text-cream-dim">Project archive</div>
        <label
          htmlFor="zip-input"
          className="mt-3 block border border-dashed border-rule bg-ink/40 p-10 text-center cursor-pointer hover:border-amber-phosphor/60 hover:bg-ink-3/40 transition-colors"
        >
          <Upload className="mx-auto h-6 w-6 text-cream-dim" strokeWidth={1.5} />
          <div className="mt-3 text-[13px] text-cream">
            {file ? (
              <span>
                {file.name}{" "}
                <span className="text-cream-faint">
                  ({(file.size / 1048576).toFixed(1)} MB)
                </span>
              </span>
            ) : (
              <span className="text-cream-dim">Drop a ZIP or click to choose</span>
            )}
          </div>
          <input
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            id="zip-input"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      <div>
        <div className="text-[13px] text-cream-dim">Name (optional)</div>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="acme-payments"
          className="mt-3 bg-ink border-rule font-mono text-[13px]"
        />
      </div>

      <Button
        disabled={!file || busy}
        onClick={upload}
        className="font-mono uppercase tracking-widest text-xs w-full sm:w-auto"
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Upload className="h-3.5 w-3.5" strokeWidth={1.5} />
        )}
        Upload & analyse
      </Button>
    </div>
  );
}
