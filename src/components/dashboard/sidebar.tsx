"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FolderGit2,
  Bot,
  CreditCard,
  Settings,
  Plus,
  Home,
  type LucideIcon
} from "lucide-react";
import { Logo } from "@/components/logo";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard",          label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/projects", label: "Projects", icon: FolderGit2 },
  { href: "/dashboard/agents",   label: "Agents",   icon: Bot },
  { href: "/dashboard/billing",  label: "Billing",  icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings }
];

export function Sidebar({ plan }: { plan: string }) {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-rule bg-ink-2/40 sticky top-0 h-screen">
      {/* Logo block */}
      <div className="px-5 h-16 flex items-center border-b border-rule">
        <Logo href="/dashboard" />
      </div>

      {/* Primary action */}
      <div className="px-4 pt-5 pb-3">
        <Link
          href="/dashboard/projects/new"
          className="btn-amber w-full text-[11px]"
        >
          <Plus className="h-3.5 w-3.5" /> New project
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pt-2 space-y-0.5">
        {NAV.map((n) => {
          const active =
            pathname === n.href || (n.href !== "/dashboard" && pathname.startsWith(n.href));
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 transition-colors text-[13.5px]",
                active
                  ? "bg-ink-3 text-amber-phosphor border-l-2 border-amber-phosphor"
                  : "text-cream-dim border-l-2 border-transparent hover:text-cream hover:bg-ink-3/50"
              )}
            >
              <n.icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              <span>{n.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer block */}
      <div className="px-5 py-4 border-t border-rule space-y-3">
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-cream-faint">Plan</span>
          <span className="text-amber-phosphor">{plan}</span>
        </div>
        <Link
          href="/"
          className="flex items-center gap-2 text-[12px] text-cream-faint hover:text-cream transition-colors"
        >
          <Home className="h-3.5 w-3.5" strokeWidth={1.5} /> Back to site
        </Link>
      </div>
    </aside>
  );
}
