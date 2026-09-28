"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";

type SyncFailure = { path: string; error: string };

type SyncResult = {
  status: "completed" | "failed";
  filesSeen: number;
  created: number;
  updated: number;
  removed: number;
  skipped: number;
  deferred: number;
  failed: SyncFailure[];
  embedJobId?: string;
  error?: string;
};

export function KnowledgeSyncButton({
  canSync,
  configured,
  hasSelections,
}: {
  canSync: boolean;
  configured: boolean;
  hasSelections: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!canSync) return null;

  const disabled = isPending || !configured || !hasSelections;

  async function handleSync() {
    setIsPending(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/knowledge/sources/sync", { method: "POST" });
      const payload = (await response.json().catch(() => null)) as
        | { result?: SyncResult; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? t("knowledge.sources.syncFailed"));
      }

      if (payload?.result) {
        setResult(payload.result);
      }
      router.refresh();
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : t("knowledge.sources.syncFailed"));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleSync();
        }}
      >
        <button
          type="submit"
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending && (
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              aria-hidden
              className="animate-spin"
            >
              <path d="M21 12a9 9 0 1 1-6.2-8.6" />
            </svg>
          )}
          {isPending ? t("knowledge.sources.syncing") : t("knowledge.sources.syncNow")}
        </button>
      </form>

      {error && (
        <p className="max-w-sm rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {result && (
        <div className="w-full rounded-xl border border-border bg-card px-4 py-3 text-left text-xs shadow-sm sm:max-w-sm">
          <p className="flex items-center gap-2 font-semibold">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                result.status === "failed" ? "bg-red-500" : "bg-emerald-500"
              }`}
            />
            {result.status === "failed"
              ? t("knowledge.sources.syncFailed")
              : t("knowledge.sources.syncComplete")}
          </p>
          <p className="mt-1.5 text-[color:var(--muted)]">
            {t("knowledge.sources.filesSeen", { count: result.filesSeen })}
          </p>
          <p className="mt-1 text-[color:var(--muted)]">
            {t("knowledge.sources.resultSummary", {
              created: result.created,
              updated: result.updated,
              removed: result.removed,
              skipped: result.skipped,
              deferred: result.deferred,
            })}
          </p>
          {result.embedJobId && (
            <p className="mt-1 text-[color:var(--muted)]">{t("knowledge.sources.embedQueued")}</p>
          )}
          {result.error && <p className="mt-1 text-red-600 dark:text-red-400">{result.error}</p>}
          {result.failed.length > 0 && (
            <ul className="mt-2 space-y-1 border-t border-border pt-2 text-red-600 dark:text-red-400">
              {result.failed.slice(0, 5).map((failure) => (
                <li key={failure.path} className="break-all">
                  {failure.path}: {failure.error}
                </li>
              ))}
              {result.failed.length > 5 && (
                <li>{t("knowledge.sources.moreErrors", { count: result.failed.length - 5 })}</li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
