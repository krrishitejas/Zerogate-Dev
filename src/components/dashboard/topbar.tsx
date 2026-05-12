"use client";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Logo } from "@/components/logo";
import { LogOut, User, Plus } from "lucide-react";

export function Topbar({
  user
}: {
  user: { email?: string | null; name?: string | null; image?: string | null; plan?: string };
}) {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-ink/75 border-b border-rule">
      <div className="h-16 px-4 md:px-8 flex items-center justify-between gap-4">
        {/* Left — logo (mobile only) */}
        <div className="flex items-center min-w-0">
          <div className="md:hidden">
            <Logo href="/dashboard" />
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/projects/new"
            className="hidden sm:inline-flex btn-amber text-[11px]"
          >
            <Plus className="h-3.5 w-3.5" /> New scan
          </Link>

          <span className="hidden sm:inline text-[13px] text-cream-dim truncate max-w-[180px]">
            {user.email}
          </span>

          <div className="h-9 w-9 border border-rule bg-ink-2 flex items-center justify-center overflow-hidden">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.image} alt="avatar" className="h-full w-full object-cover" />
            ) : (
              <User className="h-4 w-4 text-cream-dim" strokeWidth={1.5} />
            )}
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="inline-flex h-9 w-9 items-center justify-center border border-rule text-cream-dim hover:text-amber-phosphor hover:border-amber-phosphor/50 transition-colors"
            aria-label="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </header>
  );
}
