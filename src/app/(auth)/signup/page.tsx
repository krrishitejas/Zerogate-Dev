"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Github, Loader2 } from "lucide-react";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error?.email?.[0] || j.error?.password?.[0] || j.error || "Sign-up failed");
      }
      const sign = await signIn("credentials", { redirect: false, email, password });
      if (sign?.error) throw new Error("Account created — please sign in");
      toast.success("Account created");
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message ?? "Sign-up failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card-cyber p-8">
      <h1 className="font-display text-2xl font-bold tracking-tight">Create your ZEROGATE account</h1>
      <p className="mt-1 text-sm text-muted-foreground">Start free. Upgrade when your codebase grows.</p>

      <Button
        variant="secondary"
        className="w-full mt-6"
        onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
      >
        <Github className="h-4 w-4" /> Continue with GitHub
      </Button>

      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-white/10" />
        <span>or with email</span>
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <Input placeholder="Full name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
        <Input
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          type="password"
          placeholder="Password (min 8 chars)"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/signin" className="text-foreground hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
