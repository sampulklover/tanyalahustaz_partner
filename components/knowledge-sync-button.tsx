"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { emitSyncStarted } from "@/lib/activity-events";

/**
 * Starts a sync and hands the run id to the shared activity panel, which shows
 * progress and the result.
 */
export function KnowledgeSyncButton({
  canSync,
  configured,
  hasSelections,
  additions = null,
  removals = null,
  fullWidth = false,
}: {
  canSync: boolean;
  configured: boolean;
  hasSelections: boolean;
  additions?: number | null;
  removals?: number | null;
  fullWidth?: boolean;
}) {
  const { t } = useI18n();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canSync) return null;

  const previewSummary =
    additions === null && removals === null
      ? null
      : [
          additions ? t("knowledge.sources.previewAdd", { count: additions }) : null,
          removals ? t("knowledge.sources.previewRemove", { count: removals }) : null,
        ]
          .filter(Boolean)
          .join(" · ");

  async function handleSync() {
    setIsPending(true);
    setError(null);

    try {
      const response = await fetch("/api/knowledge/sources/sync", { method: "POST" });
      const payload = (await response.json().catch(() => null)) as
        | { runId?: string; error?: string }
        | null;

      if (!response.ok || !payload?.runId) {
        throw new Error(payload?.error ?? t("knowledge.sources.syncFailed"));
      }

      emitSyncStarted(payload.runId);
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : t("knowledge.sources.syncFailed"));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleSync();
        }}
      >
        <button
          type="submit"
          disabled={isPending || !configured || !hasSelections}
          className={`inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-50 ${
            fullWidth ? "w-full" : ""
          }`}
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
          {isPending ? t("knowledge.sources.syncing") : t("knowledge.sources.syncSelected")}
          {!isPending && (additions || removals) && (
            <span
              title={previewSummary ?? undefined}
              className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold tabular-nums"
            >
              {additions ? `+${additions}` : ""}
              {additions && removals ? " " : ""}
              {removals ? `−${removals}` : ""}
            </span>
          )}
        </button>
      </form>

      {error && (
        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}
    </>
  );
}
