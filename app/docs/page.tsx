import Link from "next/link";
import { CONSUMER_APP_NAME, CONSUMER_APP_URL } from "@/lib/brand";

export const metadata = { title: "Documentation" };

export default function DocsPage() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <article className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Developer platform</h1>
      <p className="lead text-[color:var(--muted)]">
        Integrate the same knowledge-backed Islamic AI that powers{" "}
        <a
          href={CONSUMER_APP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-brand-600 hover:underline dark:text-brand-500"
        >
          {CONSUMER_APP_NAME}
        </a>{" "}
        into your product. Send a user question; we retrieve relevant knowledge, build a
        grounded prompt, and return an AI answer with cited sources.
      </p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">How it works</h2>
        <ol className="list-decimal space-y-2 pl-5 text-[color:var(--muted)]">
          <li>Your app sends a user question to <code>POST /api/v1/chat</code>.</li>
          <li>We embed the question and search the knowledge base with semantic retrieval (RAG).</li>
          <li>Relevant passages are injected into the AI prompt as context.</li>
          <li>Earlier messages in the same <code>session_id</code> are included for follow-up questions.</li>
          <li>We return the answer with source article references.</li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Base URL</h2>
        <pre className="overflow-x-auto rounded-xl border border-border bg-background-subtle p-4 text-sm">
          {baseUrl}/api/v1
        </pre>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Quick start</h2>
        <ol className="list-decimal space-y-2 pl-5 text-[color:var(--muted)]">
          <li>Create a developer account and sign in.</li>
          <li>Go to Dashboard → API Keys and create a key.</li>
          <li>
            POST a message to <code>/api/v1/chat</code> from your backend — or use the{" "}
            <Link href="/dashboard/playground" className="text-brand-600 hover:underline dark:text-brand-500">
              playground
            </Link>{" "}
            to test first.
          </li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Example: AI chat</h2>
        <pre className="overflow-x-auto rounded-xl border border-border bg-background-subtle p-4 text-sm">
{`curl -X POST ${baseUrl}/api/v1/chat \\
  -H "Authorization: Bearer tlh_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"message":"Can a traveler combine Dhuhr and Asr?","category":"fiqh","session_id":"user-123"}'`}
        </pre>
      </section>
    </article>
  );
}
