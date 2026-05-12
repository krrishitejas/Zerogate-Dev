"use client";
import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Github, Loader2 } from "lucide-react";

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="card-cyber p-8">Loading…</div>}>
      <SignInForm />
    </Suspense>
  );
}

function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await signIn("credentials", { redirect: false, email, password, callbackUrl });
    setLoading(false);
    if (res?.error) {
      toast.error("Invalid email or password");
      return;
    }
    toast.success("Welcome back");
    router.push(callbackUrl);
  }

  return (
    <div className="card-cyber p-8">
      <h1 className="font-display text-2xl font-bold tracking-tight">Sign in to ZEROGATE</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Use GitHub for full repo access, or your email and password.
      </p>

      <Button
        variant="secondary"
        className="w-full mt-6"
        onClick={() => {
          setOauthLoading(true);
          signIn("github", { callbackUrl });
        }}
        disabled={oauthLoading}
      >
        {oauthLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Github className="h-4 w-4" />}
        Continue with GitHub
      </Button>

      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-white/10" />
        <span>or with email</span>
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <form onSubmit={handleEmail} className="space-y-3">
        <Input
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <Link href="/signup" className="text-foreground hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
