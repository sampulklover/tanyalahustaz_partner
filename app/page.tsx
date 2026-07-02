import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-medium uppercase tracking-wider text-emerald-600">
              Partner API Platform
            </p>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Build on TanyaLah Ustaz with a secure partner API
            </h1>
            <p className="mt-6 text-lg text-zinc-600 dark:text-zinc-400">
              Sign up, generate API keys, and integrate with our platform. Your keys
              stay private — we proxy all requests through our server, never exposing
              Supabase credentials to clients.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/signup"
                className="rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white transition hover:bg-emerald-700"
              >
                Get started
              </Link>
              <Link
                href="/docs"
                className="rounded-lg border border-zinc-300 px-6 py-3 font-medium transition hover:bg-white dark:border-zinc-700 dark:hover:bg-zinc-900"
              >
                Read the docs
              </Link>
            </div>
          </div>

          <div className="mt-20 grid gap-6 sm:grid-cols-3">
            {[
              {
                title: "Developer portal",
                body: "Login, manage API keys, revoke access, and track last usage from your dashboard.",
              },
              {
                title: "Documented REST API",
                body: "Versioned endpoints under /api/v1 with authentication and usage logging built in.",
              },
              {
                title: "Supabase backend",
                body: "Postgres + Auth + RLS for multi-tenant data. Your API layer sits in front, not exposed.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <h2 className="font-semibold">{item.title}</h2>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{item.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <footer className="border-t border-zinc-200 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800">
        TanyaLah Ustaz Partner API
      </footer>
    </>
  );
}
