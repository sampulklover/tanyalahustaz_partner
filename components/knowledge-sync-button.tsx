"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { useToast } from "@/components/toast";
import { emitSyncStarted } from "@/lib/activity-events";
import { createClient } from "@/lib/supabase/client";

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
  perRun = null,
  estimatedCostUsd = null,
  estimatedCostUsdTotal = null,
  previewLoading = false,
  fullWidth = false,
}: {
  canSync: boolean;
  configured: boolean;
  hasSelections: boolean;
  additions?: number | null;
  removals?: number | null;
  perRun?: number | null;
  estimatedCostUsd?: number | null;
  estimatedCostUsdTotal?: number | null;
  previewLoading?: boolean;
  fullWidth?: boolean;
}) {
  const { t } = useI18n();
  const { info: toastInfo, error: toastError } = useToast();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prune, setPrune] = useState(false);

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
      // A stale access token would make the route answer 403. Refresh first.
      try {
        await createClient().auth.getSession();
      } catch {
        // Ignore; the request below will surface a real error if any.
      }

      const response = await fetch("/api/knowledge/sources/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prune }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { runId?: string; error?: string }
        | null;

      if (!response.ok || !payload?.runId) {
        throw new Error(payload?.error ?? t("knowledge.sources.syncFailed"));
      }

      emitSyncStarted(payload.runId);
      toastInfo(t("knowledge.sources.syncStarted"));
    } catch (syncError) {
      const message =
        syncError instanceof Error ? syncError.message : t("knowledge.sources.syncFailed");
      setError(message);
      toastError(message);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      {hasSelections && (
        <label className="mb-2 flex cursor-pointer items-start gap-2 text-xs leading-relaxed text-[color:var(--muted)]">
          <input
            type="checkbox"
            checked={prune}
            disabled={isPending}
            onChange={(event) => setPrune(event.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-border accent-red-600"
          />
          <span>{t("knowledge.sources.pruneOption")}</span>
        </label>
      )}
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
          <span>
            {isPending ? t("knowledge.sources.syncing") : t("knowledge.sources.syncSelected")}
          </span>
          {!isPending && previewLoading && additions === null && removals === null ? (
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold tabular-nums">
              {t("knowledge.sources.previewCounting")}
            </span>
          ) : null}
          {!isPending && (additions || removals) ? (
            <span
              title={previewSummary ?? undefined}
              className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold tabular-nums"
            >
              {perRun != null && additions != null
                ? `+${Math.min(additions, perRun)}`
                : additions
                  ? `+${additions}`
                  : null}
              {additions && removals ? " " : null}
              {removals ? `−${removals}` : null}
            </span>
          ) : null}
        </button>
      </form>

      {!isPending && perRun != null && additions != null && additions > perRun ? (
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
          {t("knowledge.sources.syncCapNote", {
            thisRun: perRun,
            total: additions,
          })}
        </p>
      ) : null}

      {!isPending && estimatedCostUsd != null && estimatedCostUsd > 0 ? (
        <p className="mt-2 text-xs text-[color:var(--muted)]">
          {t("knowledge.sources.estimatedCostNote", {
            cost: `$${estimatedCostUsd.toFixed(4)}`,
          })}
          {estimatedCostUsdTotal != null &&
          additions != null &&
          additions > (perRun ?? 0) &&
          estimatedCostUsdTotal > estimatedCostUsd
            ? ` ${t("knowledge.sources.estimatedCostTotalNote", {
                cost: `$${estimatedCostUsdTotal.toFixed(4)}`,
              })}`
            : null}
        </p>
      ) : null}

      {!isPending && estimatedCostUsd != null && estimatedCostUsd > 0 && (
        <p className="mt-1 text-[11px] leading-relaxed text-[color:var(--muted)]">
          {t("knowledge.sources.estimatedCostFootnote")}
        </p>
      )}

      {error && (
        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}
    </>
  );
}
