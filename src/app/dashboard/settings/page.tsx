import { redirect } from "next/navigation";
import { getCurrentUser, getPlan } from "@/lib/session";
import { SettingsForm } from "@/components/dashboard/settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  return (
    <div className="space-y-10 max-w-3xl">
      <div>
        <h1 className="font-display text-[36px] sm:text-[44px] leading-[1.05] tracking-tight text-cream">
          Account &{" "}
          <span className="italic text-amber-phosphor">integrations.</span>
        </h1>
        <p className="mt-2 font-reading text-[15px] leading-[1.55] text-cream-dim max-w-xl">
          Connections, notifications, API access.
        </p>
      </div>

      <SettingsForm
        user={{
          email: user.email,
          name: user.name ?? "",
          githubLogin: user.githubLogin ?? null,
          hasGithubToken: !!user.githubToken,
          plan: getPlan(user)
        }}
      />
    </div>
  );
}
