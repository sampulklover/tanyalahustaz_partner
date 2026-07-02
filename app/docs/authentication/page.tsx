export const metadata = { title: "Authentication" };

export default function AuthenticationDocsPage() {
  return (
    <article className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Authentication</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        All protected endpoints require an API key. Keys are created in the partner
        dashboard and stored as SHA-256 hashes — we never store the full key.
      </p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Headers</h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          Use either of these methods:
        </p>
        <pre className="overflow-x-auto rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
{`Authorization: Bearer tlh_live_...
# or
X-API-Key: tlh_live_...`}
        </pre>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Key format</h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          Keys are prefixed with <code>tlh_live_</code> followed by a random secret.
          Revoked keys return <code>401 Unauthorized</code>.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Portal vs API auth</h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          The developer portal uses Supabase Auth (email/password). The public API uses
          API keys. These are separate auth systems — portal login does not authenticate
          API requests.
        </p>
      </section>
    </article>
  );
}
