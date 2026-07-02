export const metadata = { title: "Endpoints" };

export default function EndpointsDocsPage() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const endpoints = [
    {
      method: "GET",
      path: "/health",
      auth: false,
      description: "Health check. No authentication required.",
      response: `{ "status": "ok", "version": "v1" }`,
    },
    {
      method: "GET",
      path: "/me",
      auth: true,
      description: "Returns the authenticated partner profile and key metadata.",
      response: `{
  "partner": {
    "id": "uuid",
    "email": "partner@example.com",
    "company_name": "Acme Inc"
  },
  "api_key": {
    "id": "uuid",
    "name": "Production"
  }
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
          key={endpoint.path}
          className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-md bg-emerald-100 px-2 py-1 font-mono text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
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
          <pre className="mt-4 overflow-x-auto rounded-lg bg-zinc-50 p-4 text-xs dark:bg-zinc-950">
            {endpoint.response}
          </pre>
        </section>
      ))}
    </article>
  );
}
