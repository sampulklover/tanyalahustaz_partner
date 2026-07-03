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
              Partner AI API
            </p>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Add TanyaLah Ustaz Islamic AI to your website
            </h1>
            <p className="mt-6 text-lg text-zinc-600 dark:text-zinc-400">
              Partners integrate one API to offer AI-powered Islamic guidance on their own sites.
              We manage the knowledge base, enrich prompts with curated content, and generate
              answers via OpenRouter — you never touch the AI provider directly.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/signup"
                className="rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white transition hover:bg-emerald-700"
              >
                Get API access
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
                title: "Knowledge-backed AI",
                body: "Answers are grounded in TanyaLah Ustaz curated articles on fiqh, ibadah, and more — not generic LLM guesses.",
              },
              {
                title: "Simple chat API",
                body: "POST /api/v1/chat from your website. Pass a user message, get an AI reply with source references.",
              },
              {
                title: "Partner portal",
                body: "Sign up, create API keys, view chat logs, and monitor usage — all without exposing backend credentials.",
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
