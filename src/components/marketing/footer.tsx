import Link from "next/link";
import { Logo } from "@/components/logo";

/* ──────────────────────────────────────────────────────────────────────────
   FOOTER — clean and minimal.
   ──────────────────────────────────────────────────────────────────────── */

export function MarketingFooter() {
  return (
    <footer className="relative mt-12 border-t border-rule">
      <div className="container grid gap-12 py-16 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Logo />
          <p className="mt-5 max-w-sm font-reading text-[14.5px] leading-[1.55] text-cream-dim">
            The autonomous security swarm for your codebase.
          </p>
        </div>

        <div className="lg:col-span-7 grid gap-10 sm:grid-cols-3">
          <FooterColumn
            title="Product"
            links={[
              { label: "How it works", href: "/#workflow" },
              { label: "Agents",       href: "/#agents" },
              { label: "Pricing",      href: "/pricing" }
            ]}
          />
          <FooterColumn
            title="Company"
            links={[
              { label: "About",   href: "/about" },
              { label: "Blog",    href: "/blog" },
              { label: "Contact", href: "/contact" }
            ]}
          />
          <FooterColumn
            title="Resources"
            links={[
              { label: "Documentation", href: "/docs" },
              { label: "Security",      href: "/security" },
              { label: "Changelog",     href: "/changelog" }
            ]}
          />
        </div>
      </div>

      <div className="border-t border-rule">
        <div className="container flex flex-col gap-2 py-5 sm:flex-row sm:items-center sm:justify-between font-mono text-[10.5px] uppercase tracking-[0.22em] text-cream-faint">
          <span>© {new Date().getFullYear()} ZEROGATE Labs</span>
          <span className="hidden sm:inline">Built for engineers.</span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <div className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-amber-phosphor pb-3 mb-2 border-b border-rule">
        {title}
      </div>
      <ul className="space-y-1">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="block py-1.5 font-mono text-[12px] text-cream-dim hover:text-amber-phosphor transition-colors"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
