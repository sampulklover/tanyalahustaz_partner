export const metadata = { title: "Documentation" };

export default function DocsPage() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <article className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">API Documentation</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        The TanyaLah Ustaz Partner API lets integrated partners access platform data
        securely using API keys. All requests go through our Next.js API layer — never
        call Supabase directly.
      </p>

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
          <li>Copy the key immediately — it is only shown once.</li>
          <li>Call the API with the key in your request headers.</li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Example request</h2>
        <pre className="overflow-x-auto rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
{`curl ${baseUrl}/api/v1/me \\
  -H "Authorization: Bearer tlh_live_YOUR_KEY"`}
        </pre>
      </section>
    </article>
  );
}
