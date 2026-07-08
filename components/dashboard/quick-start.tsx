import { CopyButton } from "@/components/copy-button";

export function QuickStartSnippet({ baseUrl }: { baseUrl: string }) {
  const chatSnippet = `curl -X POST ${baseUrl}/api/v1/chat \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"message":"Can a traveler combine Dhuhr and Asr?","category":"fiqh"}'`;

  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold">Quick start</h2>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Replace <code className="text-xs">YOUR_API_KEY</code> with a key from{" "}
            <a href="/dashboard/api-keys" className="text-brand-600 hover:underline dark:text-brand-500">
              API keys
            </a>
            .
          </p>
        </div>
        <CopyButton value={chatSnippet} />
      </div>
      <pre className="mt-4 overflow-x-auto rounded-lg border border-border bg-background-subtle p-4 text-xs leading-relaxed">
        {chatSnippet}
      </pre>
      <p className="mt-3 font-mono text-xs text-[color:var(--muted)]">
        Base URL: {baseUrl}/api/v1
      </p>
    </section>
  );
}
