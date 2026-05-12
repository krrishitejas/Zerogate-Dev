"use client";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Github, Loader2, Bell, Key, AlertTriangle } from "lucide-react";

/**
 * Settings — grouped: Account · GitHub · Notifications · API key · Danger zone.
 * No marketing copy, just direct actions.
 */
export function SettingsForm({
  user
}: {
  user: { email: string; name: string; githubLogin: string | null; hasGithubToken: boolean; plan: string };
}) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [notifyOnFinding, setNotifyOnFinding] = useState(true);
  const [notifyOnFix, setNotifyOnFix] = useState(true);
  const [showApiKey, setShowApiKey] = useState(false);
  const apiKey = `zg_live_${user.email.split("@")[0].toLowerCase()}_••••••••••••`;

  async function saveToken(clear = false) {
    setBusy(true);
    try {
      const res = await fetch("/api/user/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: clear ? null : token })
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Failed");
      toast.success(clear ? "GitHub disconnected" : "GitHub token saved");
      setToken("");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  function copyApiKey() {
    navigator.clipboard.writeText(apiKey).then(
      () => toast.success("API key copied"),
      () => toast.error("Could not copy")
    );
  }

  async function deleteAccount() {
    const confirmed = window.confirm(
      "Delete your account permanently? This cannot be undone."
    );
    if (!confirmed) return;
    toast.message("Account deletion not enabled in this build.", {
      description: "Wire to /api/user/delete in production."
    });
  }

  return (
    <div className="space-y-6">
      {/* Account */}
      <Section title="Account">
        <div className="grid sm:grid-cols-2 gap-px bg-rule border border-rule">
          <Field label="Email" value={user.email} />
          <Field label="Name" value={user.name || "—"} />
          <Field label="GitHub" value={user.githubLogin || "Not connected"} />
          <Field label="Plan" value={user.plan} accent="amber" />
        </div>
      </Section>

      {/* GitHub */}
      <Section
        title="GitHub"
        action={
          <span
            className={`chip ${
              user.hasGithubToken ? "chip-moss" : "chip"
            }`}
          >
            {user.hasGithubToken ? "connected" : "not connected"}
          </span>
        }
      >
        <p className="font-reading text-[14px] leading-[1.55] text-cream-dim">
          Sign in with GitHub for OAuth, or paste a personal access token with{" "}
          <code className="font-mono text-[12px] text-amber-phosphor">repo</code> scope to import private repos and push fixes.
        </p>
        <div className="mt-5 flex gap-2">
          <Input
            type="password"
            placeholder="ghp_…"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="bg-ink border-rule font-mono text-[13px]"
          />
          <Button
            onClick={() => saveToken(false)}
            disabled={busy || !token}
            className="font-mono uppercase tracking-widest text-xs"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <Github className="h-3.5 w-3.5" strokeWidth={1.5} /> Save
              </>
            )}
          </Button>
          {user.hasGithubToken && (
            <Button
              onClick={() => saveToken(true)}
              disabled={busy}
              variant="secondary"
              className="font-mono uppercase tracking-widest text-xs"
            >
              Disconnect
            </Button>
          )}
        </div>
      </Section>

      {/* Notifications */}
      <Section title="Notifications" icon={Bell}>
        <div className="space-y-3">
          <Toggle
            label="Notify on new finding"
            sub="Email me when an agent surfaces a vulnerability."
            checked={notifyOnFinding}
            onChange={(v) => {
              setNotifyOnFinding(v);
              toast.success(v ? "Findings: on" : "Findings: off");
            }}
          />
          <Toggle
            label="Notify on auto-fix"
            sub="Email me when ZEROGATE opens a fix PR."
            checked={notifyOnFix}
            onChange={(v) => {
              setNotifyOnFix(v);
              toast.success(v ? "Fixes: on" : "Fixes: off");
            }}
          />
        </div>
      </Section>

      {/* API key */}
      <Section title="API key" icon={Key}>
        <p className="font-reading text-[14px] leading-[1.55] text-cream-dim">
          Use the CLI or CI to trigger scans without leaving your terminal.
        </p>
        <div className="mt-5 flex gap-2">
          <Input
            readOnly
            type={showApiKey ? "text" : "password"}
            value={apiKey}
            className="bg-ink border-rule font-mono text-[13px]"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowApiKey((v) => !v)}
            className="font-mono uppercase tracking-widest text-xs"
          >
            {showApiKey ? "Hide" : "Show"}
          </Button>
          <Button
            type="button"
            onClick={copyApiKey}
            className="font-mono uppercase tracking-widest text-xs"
          >
            Copy
          </Button>
        </div>
      </Section>

      {/* Danger zone */}
      <Section
        title="Danger zone"
        icon={AlertTriangle}
        accent="crit"
      >
        <p className="font-reading text-[14px] leading-[1.55] text-cream-dim">
          Permanently delete your account, projects, scans, findings, and tokens. This cannot be undone.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="btn-outline text-[11px]"
          >
            Sign out
          </button>
          <button
            onClick={deleteAccount}
            className="btn-outline text-[11px] !border-crit !text-crit hover:!bg-crit/10"
          >
            Delete account
          </button>
        </div>
      </Section>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */

function Section({
  title,
  icon: Icon,
  children,
  action,
  accent = "default"
}: {
  title: string;
  icon?: any;
  children: React.ReactNode;
  action?: React.ReactNode;
  accent?: "default" | "crit";
}) {
  return (
    <section
      className={`border bg-ink-2 p-6 ${
        accent === "crit" ? "border-crit/40" : "border-rule"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <Icon
              className={`h-4 w-4 ${
                accent === "crit" ? "text-crit" : "text-amber-phosphor"
              }`}
              strokeWidth={1.5}
            />
          )}
          <h2
            className={`font-display text-[22px] italic ${
              accent === "crit" ? "text-crit" : "text-cream"
            }`}
          >
            {title}
          </h2>
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  accent
}: {
  label: string;
  value: string;
  accent?: "amber";
}) {
  return (
    <div className="bg-ink-2 px-5 py-4">
      <div className="text-[12px] text-cream-faint">{label}</div>
      <div
        className={`mt-1.5 text-[13.5px] truncate ${
          accent === "amber" ? "text-amber-phosphor" : "text-cream"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function Toggle({
  label,
  sub,
  checked,
  onChange
}: {
  label: string;
  sub?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between gap-4 border border-rule bg-ink/40 px-4 py-3.5 hover:bg-ink-3/40 transition-colors text-left"
    >
      <div className="min-w-0">
        <div className="text-[14px] text-cream">{label}</div>
        {sub && (
          <div className="mt-0.5 text-[13px] text-cream-dim">{sub}</div>
        )}
      </div>
      <span
        className={`relative h-5 w-9 shrink-0 border transition-colors ${
          checked
            ? "bg-amber-phosphor border-amber-phosphor"
            : "bg-ink border-rule"
        }`}
      >
        <span
          className={`absolute top-0.5 h-3.5 w-3.5 transition-all ${
            checked ? "left-[18px] bg-ink" : "left-0.5 bg-cream-dim"
          }`}
        />
      </span>
    </button>
  );
}
