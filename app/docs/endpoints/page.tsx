import { getMessages, getTranslations } from "@/lib/i18n/server";

export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t("docs.endpoints.title") };
}

const endpointExamples: Record<
  string,
  { auth: boolean; request?: string; response: string }
> = {
  "/health": {
    auth: false,
    response: `{ "status": "ok", "version": "v1", "timestamp": "..." }`,
  },
  "/me": {
    auth: true,
    response: `{
  "partner": { "id": "uuid", "email": "...", "company_name": "..." },
  "api_key": { "id": "uuid", "name": "Production", "last_used_at": null }
}`,
  },
  "/chat": {
    auth: true,
    request: `{
  "message": "Can a traveler combine Dhuhr and Asr?",
  "category": "fiqh",
  "session_id": "your-user-session-id"
}`,
    response: `{
  "reply": "Travelers may combine Dhuhr with Asr...",
  "session_id": "your-user-session-id",
  "sources": [{ "slug": "jamak-solat-musafir", "title": "...", "category": "fiqh" }]
}`,
  },
  "/knowledge": {
    auth: true,
    response: `{
  "data": [{ "slug": "jamak-solat-musafir", "title": "...", "category": "fiqh", "summary": "..." }],
  "pagination": { "limit": 20, "offset": 0, "total": 3 }
}`,
  },
  "/knowledge/:slug": {
    auth: true,
    response: `{ "data": { "slug": "jamak-solat-musafir", "title": "...", "content": "..." } }`,
  },
  "/usage": {
    auth: true,
    response: `{
  "period_days": 30,
  "total_requests": 12,
  "top_endpoints": [{ "endpoint": "/api/v1/chat", "count": 8 }],
  "recent_requests": [...]
}`,
  },
  "/openapi.json": {
    auth: false,
    response: `{ "openapi": "3.1.0", "info": { "title": "TanyaLah Ustaz Partner API", "version": "1.0.0" }, ... }`,
  },
};

export default async function EndpointsDocsPage() {
  const t = await getTranslations();
  const messages = await getMessages();
  const endpoints = messages.docs.endpoints.endpoints;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <article className="not-prose space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("docs.endpoints.title")}</h1>
        <p className="mt-3 text-[color:var(--muted)]">
          {t("docs.endpoints.description", { baseUrl })}
        </p>
      </div>

      {endpoints.map((endpoint) => {
        const example = endpointExamples[endpoint.path];

        return (
          <section
            key={`${endpoint.method}-${endpoint.path}`}
            className="rounded-2xl border border-border bg-card p-6"
          >
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`rounded-md px-2 py-1 font-mono text-xs font-semibold ${
                  endpoint.method === "GET"
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
                    : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                }`}
              >
                {endpoint.method}
              </span>
              <code className="font-mono text-sm">{endpoint.path}</code>
              <span className="text-xs text-zinc-500">
                {example?.auth ? t("docs.endpoints.authRequired") : t("docs.endpoints.public")}
              </span>
            </div>
            <p className="mt-3 text-sm text-[color:var(--muted)]">
              {endpoint.description}
            </p>
            {example?.request && (
              <>
                <p className="mt-4 text-xs font-medium uppercase tracking-wide text-[color:var(--muted)]">
                  {t("docs.endpoints.requestBody")}
                </p>
                <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-background-subtle p-4 text-xs">
                  {example.request}
                </pre>
              </>
            )}
            {example && (
              <>
                <p className="mt-4 text-xs font-medium uppercase tracking-wide text-[color:var(--muted)]">
                  {t("docs.endpoints.response")}
                </p>
                <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-background-subtle p-4 text-xs">
                  {example.response}
                </pre>
              </>
            )}
          </section>
        );
      })}
    </article>
  );
}
