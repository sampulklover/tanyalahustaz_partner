"use client";

import { useState } from "react";
import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { Panel } from "@/components/dashboard/panel";

type CheckResult = {
  ok: boolean;
  latencyMs: number;
  status: number;
  body?: unknown;
  error?: string;
};

function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export function ApiKeyVerifier({ baseUrl }: { baseUrl: string }) {
  const apiBase = `${baseUrl}/api/v1`;
  const [apiKey, setApiKey] = useState("");
  const [authCheck, setAuthCheck] = useState<CheckResult | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(false);

  async function runAuthCheck() {
    const key = apiKey.trim();
    if (!key) return;

    setCheckingAuth(true);
    const start = performance.now();
    try {
      const response = await fetch(`${apiBase}/me`, {
        headers: { Authorization: `Bearer ${key}` },
        cache: "no-store",
      });
      const body = await response.json();
      setAuthCheck({
        ok: response.ok,
        latencyMs: Math.round(performance.now() - start),
        status: response.status,
        body,
      });
    } catch (error) {
      setAuthCheck({
        ok: false,
        latencyMs: Math.round(performance.now() - start),
        status: 0,
        error: error instanceof Error ? error.message : "Request failed",
      });
    } finally {
      setCheckingAuth(false);
    }
  }

  const meSnippet = `curl ${apiBase}/me \\
  -H "Authorization: Bearer YOUR_API_KEY"`;

  return (
    <Panel
      title="Verify connection"
      description={
        <>
          Paste a key to test <code className="text-xs">GET /api/v1/me</code>. Your key is not
          stored. For system uptime, see{" "}
          <Link href="/status" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline dark:text-brand-500">
            status page
          </Link>
          .
        </>
      }
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="tlh_live_…"
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-4 py-2.5 font-mono text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
        />
        <button
          type="button"
          onClick={runAuthCheck}
          disabled={checkingAuth || apiKey.trim().length < 10}
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
        >
          {checkingAuth ? "Testing…" : "Test connection"}
        </button>
      </div>

      {authCheck && (
        <div className="mt-4 rounded-lg border border-border bg-background-subtle p-4">
          <p className="text-sm font-medium">
            {authCheck.ok ? "API key is valid" : "Connection failed"}
            <span className="ml-2 text-xs font-normal text-[color:var(--muted)]">
              HTTP {authCheck.status} · {authCheck.latencyMs}ms
            </span>
          </p>
          <pre className="mt-2 overflow-x-auto text-xs leading-relaxed text-[color:var(--muted)]">
            {authCheck.error ?? formatJson(authCheck.body)}
          </pre>
        </div>
      )}

      <div className="mt-5 flex items-start justify-between gap-4 border-t border-border pt-5">
        <div className="min-w-0">
          <p className="text-sm font-medium">Auth check</p>
          <p className="mt-1 text-xs text-[color:var(--muted)]">Requires a valid API key</p>
        </div>
        <CopyButton value={meSnippet} />
      </div>
      <pre className="mt-3 overflow-x-auto rounded-lg border border-border bg-background-subtle p-4 text-xs leading-relaxed">
        {meSnippet}
      </pre>
    </Panel>
  );
}
