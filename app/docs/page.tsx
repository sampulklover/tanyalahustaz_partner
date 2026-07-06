import Link from "next/link";

export const metadata = { title: "Documentation" };

export default function DocsPage() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <article className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Partner AI API</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Integrate TanyaLah Ustaz Islamic AI into your website. Partners call our API; we retrieve
        relevant knowledge articles, build a grounded prompt, and generate answers through OpenRouter.
      </p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">How it works</h2>
        <ol className="list-decimal space-y-2 pl-5 text-zinc-600 dark:text-zinc-400">
          <li>Your website sends a user question to <code>POST /api/v1/chat</code>.</li>
          <li>We embed the question and search <code>knowledge_chunks</code> with pgvector (semantic RAG).</li>
          <li>Relevant chunks are injected into the AI prompt as context.</li>
          <li>Earlier messages in the same <code>session_id</code> are included for follow-up questions.</li>
          <li>OpenRouter generates the answer; we return it with source references.</li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Base URL</h2>
        <pre className="overflow-x-auto rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
          {baseUrl}/api/v1
        </pre>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Quick start</h2>
        <ol className="list-decimal space-y-2 pl-5 text-zinc-600 dark:text-zinc-400">
          <li>Create a partner account and sign in.</li>
          <li>Go to Dashboard → API Keys and create a key.</li>
          <li>Set <code>OPENROUTER_API_KEY</code> on the server (platform side, not partner side).</li>
          <li>POST a message to <code>/api/v1/chat</code> from your website — or use the <Link href="/dashboard/playground" className="text-emerald-600 hover:underline">playground</Link> to test first.</li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Example: AI chat</h2>
        <pre className="overflow-x-auto rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
{`curl -X POST ${baseUrl}/api/v1/chat \\
  -H "Authorization: Bearer tlh_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"message":"Can a traveler combine Dhuhr and Asr?","category":"fiqh","session_id":"user-123"}'`}
        </pre>
      </section>
    </article>
  );
}
