import Link from "next/link";
import { DashboardHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_name, created_at")
    .eq("id", user!.id)
    .single();

  const { count: activeKeys } = await supabase
    .from("api_keys")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user!.id)
    .is("revoked_at", null);

  return (
    <>
      <DashboardHeader email={user!.email ?? ""} />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Welcome back{profile?.company_name ? `, ${profile.company_name}` : ""}.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm text-zinc-500">Active API keys</p>
            <p className="mt-2 text-3xl font-bold">{activeKeys ?? 0}</p>
            <Link
              href="/dashboard/api-keys"
              className="mt-4 inline-block text-sm font-medium text-emerald-600 hover:underline"
            >
              Manage keys →
            </Link>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm text-zinc-500">API base URL</p>
            <code className="mt-2 block text-sm">
              {process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/v1
            </code>
            <Link
              href="/docs"
              className="mt-4 inline-block text-sm font-medium text-emerald-600 hover:underline"
            >
              View documentation →
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
