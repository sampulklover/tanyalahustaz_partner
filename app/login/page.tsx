import Link from "next/link";
import { LoginForm } from "@/components/auth-forms";
import { SiteHeader } from "@/components/site-header";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect: redirectTo } = await searchParams;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
        <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Access your partner dashboard and API keys.
        </p>
        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <LoginForm redirectTo={redirectTo ?? "/dashboard"} />
        </div>
        <p className="mt-6 text-center text-sm text-zinc-500">
          <Link href="/" className="hover:underline">
            ← Back to home
          </Link>
        </p>
      </main>
    </>
  );
}
