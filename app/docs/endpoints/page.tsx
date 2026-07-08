export const metadata = { title: "Endpoints" };

export default function EndpointsDocsPage() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const endpoints = [
    {
      method: "GET",
      path: "/health",
      auth: false,
      description: "Health check. No authentication required.",
      response: `{ "status": "ok", "version": "v1", "timestamp": "..." }`,
    },
    {
      method: "GET",
      path: "/me",
      auth: true,
      description: "Returns the authenticated partner profile and API key metadata.",
      response: `{
  "partner": { "id": "uuid", "email": "...", "company_name": "..." },
  "api_key": { "id": "uuid", "name": "Production", "last_used_at": null }
}`,
    },
    {
      method: "POST",
      path: "/chat",
      auth: true,
      description:
        "Main integration endpoint. Sends a user message, retrieves relevant knowledge from the TanyaLah Ustaz library, and returns an AI reply with sources.",
      request: `{
  "message": "Can a traveler combine Dhuhr and Asr?",
  "category": "fiqh",
  "session_id": "your-user-session-id"
}`,
      response: `{
  "reply": "Travelers may combine Dhuhr with Asr...",
  "session_id": "your-user-session-id",
  "model": "google/gemini-2.0-flash-001",
  "sources": [{ "slug": "jamak-solat-musafir", "title": "...", "category": "fiqh" }]
}`,
    },
    {
      method: "GET",
      path: "/knowledge",
      auth: true,
      description:
        "Browse published knowledge articles that power the AI. Supports ?category=fiqh and ?q=search.",
      response: `{
  "data": [{ "slug": "jamak-solat-musafir", "title": "...", "category": "fiqh", "summary": "..." }],
  "pagination": { "limit": 20, "offset": 0, "total": 3 }
}`,
    },
    {
      method: "GET",
      path: "/knowledge/:slug",
      auth: true,
      description: "Get a single knowledge article by slug.",
      response: `{ "data": { "slug": "jamak-solat-musafir", "title": "...", "content": "..." } }`,
    },
    {
      method: "GET",
      path: "/usage",
      auth: true,
      description: "Usage stats for the current API key over the last 30 days.",
      response: `{
  "period_days": 30,
  "total_requests": 12,
  "top_endpoints": [{ "endpoint": "/api/v1/chat", "count": 8 }],
  "recent_requests": [...]
}`,
    },
  ];

  return (
    <article className="not-prose space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">API reference</h1>
        <p className="mt-3 text-[color:var(--muted)]">
          Every endpoint is prefixed with{" "}
          <code className="rounded bg-background-subtle px-1.5 py-0.5 font-mono text-sm">
            {baseUrl}/api/v1
          </code>
          .
        </p>
      </div>

      {endpoints.map((endpoint) => (
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
              {endpoint.auth ? "Auth required" : "Public"}
            </span>
          </div>
          <p className="mt-3 text-sm text-[color:var(--muted)]">
            {endpoint.description}
          </p>
          {"request" in endpoint && endpoint.request && (
            <>
              <p className="mt-4 text-xs font-medium uppercase tracking-wide text-[color:var(--muted)]">
                Request body
              </p>
              <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-background-subtle p-4 text-xs">
                {endpoint.request}
              </pre>
            </>
          )}
          <p className="mt-4 text-xs font-medium uppercase tracking-wide text-[color:var(--muted)]">
            Response
          </p>
          <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-background-subtle p-4 text-xs">
            {endpoint.response}
          </pre>
        </section>
      ))}
    </article>
  );
}
