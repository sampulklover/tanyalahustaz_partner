import Link from "next/link";
import { CONSUMER_APP_NAME, CONSUMER_APP_URL, DASHBOARD_NAME, SIGN_IN_LABEL } from "@/lib/brand";

export const metadata = { title: "Authentication" };

export default function AuthenticationDocsPage() {
  return (
    <article className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Authentication</h1>
      <p className="text-[color:var(--muted)]">
        Protected API endpoints require a developer API key. Keys are created in the{" "}
        <Link href="/dashboard" className="font-medium text-brand-600 hover:underline dark:text-brand-500">
          {DASHBOARD_NAME}
        </Link>{" "}
        and stored as SHA-256 hashes — we never store the full key.
      </p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Developer login vs consumer app</h2>
        <p className="text-[color:var(--muted)]">
          <Link href="/login" className="font-medium text-brand-600 hover:underline dark:text-brand-500">
            {SIGN_IN_LABEL}
          </Link>{" "}
          on this site accesses the developer {DASHBOARD_NAME.toLowerCase()} (API keys,
          playground, usage). It is separate from the{" "}
          <a
            href={CONSUMER_APP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-brand-600 hover:underline dark:text-brand-500"
          >
            {CONSUMER_APP_NAME} consumer app
          </a>
          , where individuals ask questions. Accounts are not shared between the two products.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">API key headers</h2>
        <p className="text-[color:var(--muted)]">
          Send your key on every API request using either header:
        </p>
        <pre className="overflow-x-auto rounded-xl border border-border bg-background-subtle p-4 text-sm">
{`Authorization: Bearer tlh_live_...
# or
X-API-Key: tlh_live_...`}
        </pre>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Key format</h2>
        <p className="text-[color:var(--muted)]">
          Keys are prefixed with <code>tlh_live_</code> followed by a random secret.
          Revoked keys return <code>401 Unauthorized</code>.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Dashboard vs API auth</h2>
        <p className="text-[color:var(--muted)]">
          The developer dashboard uses email/password login. Your API integration uses API
          keys. Signing into the dashboard does not authenticate API requests, and API keys
          do not grant dashboard access.
        </p>
      </section>
    </article>
  );
}
