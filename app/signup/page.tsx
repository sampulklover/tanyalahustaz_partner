import Link from "next/link";
import { SignupForm } from "@/components/auth-forms";
import { SiteHeader } from "@/components/site-header";

export const metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
        <h1 className="text-2xl font-bold tracking-tight">Create partner account</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Register to get API keys and access the developer dashboard.
        </p>
        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <SignupForm />
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
