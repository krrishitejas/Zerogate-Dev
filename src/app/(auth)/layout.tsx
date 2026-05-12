import { Logo } from "@/components/logo";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="container py-6">
        <Logo />
      </header>
      <main className="flex-1 grid place-items-center px-4 py-10">
        <div className="w-full max-w-md">{children}</div>
      </main>
      <footer className="container py-6 text-xs text-muted-foreground flex justify-between">
        <span>© {new Date().getFullYear()} ZEROGATE</span>
        <span>
          <Link href="/" className="hover:text-foreground transition">Back to home</Link>
        </span>
      </footer>
    </div>
  );
}
