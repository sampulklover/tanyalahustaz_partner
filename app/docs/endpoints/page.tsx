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
        "Main integration endpoint. Sends a user message, retrieves relevant knowledge, calls OpenRouter, and returns an AI reply.",
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
    <article className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Endpoints</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          All endpoints are prefixed with <code>{baseUrl}/api/v1</code>.
        </p>
      </div>

      {endpoints.map((endpoint) => (
        <section
          key={`${endpoint.method}-${endpoint.path}`}
          className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-md px-2 py-1 font-mono text-xs font-semibold ${
                endpoint.method === "GET"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
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
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            {endpoint.description}
          </p>
          {"request" in endpoint && endpoint.request && (
            <>
              <p className="mt-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Request body
              </p>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-zinc-50 p-4 text-xs dark:bg-zinc-950">
                {endpoint.request}
              </pre>
            </>
          )}
          <p className="mt-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Response
          </p>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-zinc-50 p-4 text-xs dark:bg-zinc-950">
            {endpoint.response}
          </pre>
        </section>
      ))}
    </article>
  );
}
