import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/signin?callbackUrl=/dashboard");
  }
  const user = session.user as { email?: string | null; name?: string | null; image?: string | null; plan?: string };

  return (
    <div className="min-h-screen flex bg-ink">
      <Sidebar plan={user.plan ?? "FREE"} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar user={user} />
        <main className="flex-1 px-4 md:px-8 py-8 md:py-10">{children}</main>
      </div>
    </div>
  );
}
