import { API_ERROR_CATALOG } from "@/lib/api/errors";
import { getTranslations } from "@/lib/i18n/server";

export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t("docs.errors.title") };
}

export default async function ErrorsDocsPage() {
  const t = await getTranslations();

  return (
    <article className="not-prose space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("docs.errors.title")}</h1>
        <p className="mt-3 text-[color:var(--muted)]">{t("docs.errors.description")}</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t("docs.errors.formatTitle")}</h2>
        <p className="text-sm text-[color:var(--muted)]">{t("docs.errors.formatDescription")}</p>
        <pre className="overflow-x-auto rounded-xl border border-border bg-background-subtle p-4 text-xs">
{`{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Field 'message' is required.",
    "request_id": "req_abc123def456"
  }
}`}
        </pre>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t("docs.errors.requestIdTitle")}</h2>
        <p className="text-sm text-[color:var(--muted)]">{t("docs.errors.requestIdDescription")}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t("docs.errors.rateLimitTitle")}</h2>
        <p className="text-sm text-[color:var(--muted)]">{t("docs.errors.rateLimitDescription")}</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-[color:var(--muted)]">
          <li><code>Retry-After</code> — {t("docs.errors.rateLimitRetryAfter")}</li>
          <li><code>X-RateLimit-Remaining-Minute</code> — {t("docs.errors.rateLimitMinute")}</li>
          <li><code>X-RateLimit-Remaining-Day</code> — {t("docs.errors.rateLimitDay")}</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">{t("docs.errors.catalogTitle")}</h2>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border bg-background-subtle text-xs uppercase tracking-wide text-[color:var(--muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">{t("docs.errors.tableCode")}</th>
                <th className="px-4 py-3 font-medium">{t("docs.errors.tableStatus")}</th>
                <th className="px-4 py-3 font-medium">{t("docs.errors.tableDescription")}</th>
              </tr>
            </thead>
            <tbody>
              {API_ERROR_CATALOG.map((entry) => (
                <tr key={entry.code} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3 font-mono text-xs">{entry.code}</td>
                  <td className="px-4 py-3">{entry.status}</td>
                  <td className="px-4 py-3 text-[color:var(--muted)]">{entry.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </article>
  );
}
