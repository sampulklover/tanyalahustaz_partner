"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { onSyncStarted } from "@/lib/activity-events";

type RunStatus = {
  id: string;
  status: "running" | "completed" | "failed";
  files_seen: number;
  created_count: number;
  updated_count: number;
  removed_count: number;
  skipped_count: number;
  deferred_count: number;
  current_path: string | null;
  error: string | null;
  embed_job_id: string | null;
};

/**
 * One place for all background work: syncing progress, the sync result, and
 * anything still waiting to be prepared for search.
 */
export function KnowledgeActivity({
  pendingEmbedJobs,
  canEdit = true,
}: {
  pendingEmbedJobs: number;
  canEdit?: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();

  const [syncRun, setSyncRun] = useState<RunStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const [embedPending, setEmbedPending] = useState(pendingEmbedJobs);
  const [embedBusy, setEmbedBusy] = useState(false);
  const [embedMessage, setEmbedMessage] = useState<string | null>(null);
  const [embedError, setEmbedError] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ticksRef = useRef(0);
  const pendingSignature = String(pendingEmbedJobs);
  const [lastPendingSignature, setLastPendingSignature] = useState(pendingSignature);

  // Adopt the server value after a refresh.
  if (lastPendingSignature !== pendingSignature) {
    setLastPendingSignature(pendingSignature);
    setEmbedPending(pendingEmbedJobs);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    return onSyncStarted((runId) => {
      setDismissed(false);
      setSyncError(null);
      setSyncRun(null);
      setSyncing(true);
      ticksRef.current = 0;

      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = setInterval(async () => {
        ticksRef.current += 1;
        if (ticksRef.current > 240) {
          if (timerRef.current) clearInterval(timerRef.current);
          setSyncing(false);
          return;
        }

        try {
          const response = await fetch(
            `/api/knowledge/sources/sync/status?runId=${encodeURIComponent(runId)}`,
          );
          const payload = (await response.json().catch(() => null)) as
            | { run?: RunStatus; error?: string }
            | null;

          if (!response.ok || !payload?.run) {
            throw new Error(payload?.error ?? t("knowledge.sources.syncFailed"));
          }

          setSyncRun(payload.run);

          if (payload.run.status !== "running") {
            if (timerRef.current) clearInterval(timerRef.current);
            setSyncing(false);
            router.refresh();
          }
        } catch (error) {
          if (timerRef.current) clearInterval(timerRef.current);
          setSyncing(false);
          setSyncError(error instanceof Error ? error.message : t("knowledge.sources.syncFailed"));
          router.refresh();
        }
      }, 1500);
    });
  }, [router, t]);

  async function finishEmbedding() {
    setEmbedBusy(true);
    setEmbedError(null);
    setEmbedMessage(null);

    try {
      const response = await fetch("/api/knowledge/sources/embed", { method: "POST" });
      const payload = (await response.json().catch(() => null)) as
        | { chunksWritten?: number; pending?: number; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? t("knowledge.sources.embedFailed"));
      }

      const remaining = payload?.pending ?? 0;
      setEmbedPending(remaining);
      setEmbedMessage(
        remaining > 0
          ? t("knowledge.sources.embedPartial", {
              chunks: payload?.chunksWritten ?? 0,
              count: remaining,
            })
          : t("knowledge.sources.embedDone", { chunks: payload?.chunksWritten ?? 0 }),
      );
      router.refresh();
    } catch (error) {
      setEmbedError(error instanceof Error ? error.message : t("knowledge.sources.embedFailed"));
    } finally {
      setEmbedBusy(false);
    }
  }

  const processed = syncRun ? syncRun.created_count + syncRun.updated_count : 0;
  const total = syncRun?.files_seen ?? 0;
  const percent = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0;

  const showSyncResult = !syncing && syncRun !== null && !dismissed;
  const showEmbedRow = embedPending > 0 || embedMessage !== null || embedError !== null;
  const visible =
    syncing || showSyncResult || syncError !== null || showEmbedRow;

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 max-w-[calc(100vw-2rem)] space-y-2">
      {(syncing || showSyncResult || syncError) && (
        <div className="rounded-xl border border-border bg-card p-4 text-xs shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <p className="flex items-center gap-2 font-semibold">
              {!syncing && (
                <span
                  className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                    syncError || syncRun?.status === "failed" ? "bg-red-500" : "bg-emerald-500"
                  }`}
                />
              )}
              {syncing
                ? t("knowledge.sources.syncing")
                : syncError || syncRun?.status === "failed"
                  ? t("knowledge.sources.syncFailed")
                  : t("knowledge.sources.syncComplete")}
            </p>
            {!syncing && (
              <button
                type="button"
                onClick={() => {
                  setDismissed(true);
                  setSyncRun(null);
                  setSyncError(null);
                }}
                aria-label={t("common.close")}
                className="rounded-md px-1.5 py-0.5 text-[color:var(--muted)] transition hover:bg-background-subtle hover:text-foreground"
              >
                ✕
              </button>
            )}
          </div>

          {syncing ? (
            <>
              <p className="mt-2 tabular-nums text-[color:var(--muted)]">
                {total > 0
                  ? t("knowledge.sources.syncProgress", { done: processed, total })
                  : t("knowledge.sources.syncPreparing")}
              </p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-background-subtle">
                <div
                  className="h-full rounded-full bg-brand-600 transition-all duration-500"
                  style={{ width: `${total > 0 ? Math.max(4, percent) : 8}%` }}
                />
              </div>
              {syncRun?.current_path && (
                <p
                  className="mt-2 truncate font-mono text-[11px] text-[color:var(--muted)]"
                  title={syncRun.current_path}
                >
                  {syncRun.current_path}
                </p>
              )}
              <p className="mt-2 text-[color:var(--muted)]">
                {t("knowledge.sources.syncBackgroundNote")}
              </p>
            </>
          ) : syncError ? (
            <p className="mt-2 break-words text-red-600 dark:text-red-400">{syncError}</p>
          ) : (
            syncRun && (
              <>
                <p className="mt-2 text-[color:var(--muted)]">
                  {t("knowledge.sources.filesSeen", { count: syncRun.files_seen })}
                </p>
                <p className="mt-1 text-[color:var(--muted)]">
                  {t("knowledge.sources.resultSummary", {
                    created: syncRun.created_count,
                    updated: syncRun.updated_count,
                    removed: syncRun.removed_count,
                    skipped: syncRun.skipped_count,
                    deferred: syncRun.deferred_count,
                  })}
                </p>
                {syncRun.deferred_count > 0 && (
                  <p className="mt-1 text-amber-700 dark:text-amber-400">
                    {t("knowledge.sources.syncRemaining", { count: syncRun.deferred_count })}
                  </p>
                )}
                {syncRun.error && (
                  <p className="mt-1 text-red-600 dark:text-red-400">{syncRun.error}</p>
                )}
              </>
            )
          )}
        </div>
      )}

      {showEmbedRow && (
        <div className="rounded-xl border border-border bg-card p-4 text-xs shadow-xl">
          {embedPending > 0 ? (
            <>
              <p className="font-semibold">
                {t("knowledge.sources.embedPreparing", { count: embedPending })}
              </p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-background-subtle">
                <div className="h-full w-1/3 animate-pulse rounded-full bg-brand-600" />
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => void finishEmbedding()}
                  disabled={embedBusy}
                  className="mt-3 rounded-lg border border-border px-3 py-1.5 font-medium transition hover:bg-background-subtle active:scale-[0.98] disabled:opacity-60"
                >
                  {embedBusy ? t("knowledge.sources.embedProcessing") : t("common.finishNow")}
                </button>
              )}
            </>
          ) : embedError ? (
            <p className="break-words text-red-600 dark:text-red-400">{embedError}</p>
          ) : (
            embedMessage && <p className="text-[color:var(--muted)]">{embedMessage}</p>
          )}
        </div>
      )}
    </div>
  );
}
