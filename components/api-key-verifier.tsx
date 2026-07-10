"use client";

import { useState } from "react";
import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { Panel } from "@/components/dashboard/panel";
import { useI18n } from "@/lib/i18n/client";

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
  const { t } = useI18n();
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
        error: error instanceof Error ? error.message : t("apiKeys.verifier.requestFailed"),
      });
    } finally {
      setCheckingAuth(false);
    }
  }

  const meSnippet = `curl ${apiBase}/me \\
  -H "Authorization: Bearer YOUR_API_KEY"`;

  const descriptionParts = t("apiKeys.verifier.description", {
    endpoint: t("apiKeys.verifier.endpoint"),
    statusLink: t("apiKeys.verifier.statusLink"),
  }).split(t("apiKeys.verifier.statusLink"));

  return (
    <Panel
      title={t("apiKeys.verifier.title")}
      description={
        <>
          {descriptionParts[0]}
          <Link href="/status" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline dark:text-brand-500">
            {t("apiKeys.verifier.statusLink")}
          </Link>
          {descriptionParts[1]}
        </>
      }
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={t("apiKeys.verifier.placeholder")}
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-4 py-2.5 font-mono text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
        />
        <button
          type="button"
          onClick={runAuthCheck}
          disabled={checkingAuth || apiKey.trim().length < 10}
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
        >
          {checkingAuth ? t("apiKeys.verifier.testing") : t("apiKeys.verifier.testConnection")}
        </button>
      </div>

      {authCheck && (
        <div className="mt-4 rounded-lg border border-border bg-background-subtle p-4">
          <p className="text-sm font-medium">
            {authCheck.ok ? t("apiKeys.verifier.keyValid") : t("apiKeys.verifier.connectionFailed")}
            <span className="ml-2 text-xs font-normal text-[color:var(--muted)]">
              {t("apiKeys.verifier.httpStatus", { status: authCheck.status, latency: authCheck.latencyMs })}
            </span>
          </p>
          <pre className="mt-2 overflow-x-auto text-xs leading-relaxed text-[color:var(--muted)]">
            {authCheck.error ?? formatJson(authCheck.body)}
          </pre>
        </div>
      )}

      <div className="mt-5 flex items-start justify-between gap-4 border-t border-border pt-5">
        <div className="min-w-0">
          <p className="text-sm font-medium">{t("apiKeys.verifier.authCheckTitle")}</p>
          <p className="mt-1 text-xs text-[color:var(--muted)]">{t("apiKeys.verifier.authCheckDescription")}</p>
        </div>
        <CopyButton value={meSnippet} />
      </div>
      <pre className="mt-3 overflow-x-auto rounded-lg border border-border bg-background-subtle p-4 text-xs leading-relaxed">
        {meSnippet}
      </pre>
    </Panel>
  );
}
