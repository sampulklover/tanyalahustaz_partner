"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  clearSourceSelections,
  toggleSourceSelection,
} from "@/app/actions/knowledge-sources";
import { KnowledgeSyncButton } from "@/components/knowledge-sync-button";
import { useToast } from "@/components/toast";
import { useI18n } from "@/lib/i18n/client";
import { isPathSynced } from "@/lib/sync-path";
import { onSyncFinished } from "@/lib/activity-events";
import {
  emitSourceSelection,
  onSourceSelection,
  type SourceSelectionEvent,
} from "@/lib/selection-events";

export type SelectedSource = { path: string; kind: "file" | "folder" };

function signatureOf(items: SelectedSource[]) {
  return items.map((item) => `${item.kind}:${item.path}`).join("|");
}

/**
 * "Selected sources" panel. Reacts instantly to ticks in the browser and
 * reconciles with the server afterwards.
 */
export function KnowledgeSelectedSources({
  initialSelections,
  syncedPaths = [],
  canEdit = true,
  configured = true,
}: {
  initialSelections: SelectedSource[];
  syncedPaths?: string[];
  canEdit?: boolean;
  configured?: boolean;
}) {
  const { t } = useI18n();
  const { error: toastError } = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const syncedSet = new Set(syncedPaths);
  const isSynced = (path: string) => isPathSynced(path, syncedSet);
  // Keep the latest synced set available to the mounted event listener.
  const syncedSetRef = useRef(syncedSet);
  useEffect(() => {
    syncedSetRef.current = syncedSet;
  });

  // Already-mirrored paths never appear in "what will sync" — there's nothing
  // left to do for them.
  const pendingSelections = initialSelections.filter((item) => !isSynced(item.path));

  const serverSignature = signatureOf(pendingSelections);
  const [state, setState] = useState({
    signature: serverSignature,
    items: pendingSelections,
  });

  // Adopt the server value once a refresh brings new data.
  if (state.signature !== serverSignature) {
    setState({ signature: serverSignature, items: pendingSelections });
  }

  const items = state.items;

  // Tick / untick in the browser list updates this panel immediately.
  useEffect(() => {
    return onSourceSelection((event: SourceSelectionEvent) => {
      setState((previous) => {
        if (event.type === "clear") {
          return { ...previous, items: [] };
        }

        const exists = previous.items.some((item) => item.path === event.path);
        if (event.selected && !exists) {
          if (isPathSynced(event.path, syncedSetRef.current)) return previous;
          return {
            ...previous,
            items: [...previous.items, { path: event.path, kind: event.kind }],
          };
        }
        if (!event.selected && exists) {
          return {
            ...previous,
            items: previous.items.filter((item) => item.path !== event.path),
          };
        }
        return previous;
      });
    });
  }, []);

  // Fetch what the next sync would change, on demand (never during navigation).
  const [preview, setPreview] = useState<{
    additions: number;
    removals: number;
    perRun: number;
    estimatedCostUsd: number;
    estimatedCostUsdTotal: number;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  // Bumped when a sync finishes so the preview re-fetches for the new state.
  const [previewTick, setPreviewTick] = useState(0);

  useEffect(() => {
    return onSyncFinished(() => setPreviewTick((value) => value + 1));
  }, []);
  const selectionSignature = items
    .map((item) => `${item.kind}:${item.path}`)
    .sort()
    .join("|");

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (items.length === 0) {
        if (!cancelled) {
          setPreview(null);
          setPreviewLoading(false);
        }
        return;
      }

      if (!cancelled) setPreviewLoading(true);

      try {
        const response = await fetch("/api/knowledge/sources/preview");
        const payload = (await response.json().catch(() => null)) as
          | {
              preview?: {
                additions: number;
                removals: number;
                perRun: number;
                estimatedCostUsd: number;
                estimatedCostUsdTotal: number;
              } | null;
            }
          | null;
        if (!cancelled) setPreview(payload?.preview ?? null);
      } catch {
        if (!cancelled) setPreview(null);
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    };

    const timer = setTimeout(() => {
      void run();
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [selectionSignature, items.length, previewTick]);

  const folderCount = items.filter((item) => item.kind === "folder").length;
  const fileCount = items.filter((item) => item.kind === "file").length;

  function clearAll() {
    if (items.length === 0) return;
    setState((previous) => ({ ...previous, items: [] })); // instant
    emitSourceSelection({ type: "clear" });

    startTransition(async () => {
      try {
        await clearSourceSelections();
      } catch {
        toastError(t("knowledge.sources.selectionFailed"));
      } finally {
        router.refresh();
      }
    });
  }

  function remove(path: string, kind: SelectedSource["kind"]) {
    setState((previous) => ({
      ...previous,
      items: previous.items.filter((item) => item.path !== path),
    })); // instant
    emitSourceSelection({ type: "set", path, kind, selected: false });

    const formData = new FormData();
    formData.set("path", path);
    formData.set("kind", kind);
    formData.set("selected", "false");

    startTransition(async () => {
      try {
        await toggleSourceSelection(formData);
      } catch {
        toastError(t("knowledge.sources.selectionFailed"));
      } finally {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex max-h-[min(26rem,calc(100dvh_-_30rem))] min-h-[12rem] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-5 py-4">
        <h3 className="flex items-center gap-2 font-semibold">
          {t("knowledge.sources.picker.selectedTitle")}
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
            {items.length}
          </span>
        </h3>
        {items.length > 0 && canEdit && (
          <button
            type="button"
            onClick={clearAll}
            className="rounded-md px-2 py-1 text-xs font-medium text-[color:var(--muted)] transition hover:bg-background-subtle hover:text-foreground"
          >
            {t("knowledge.sources.picker.clearAll")}
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-background-subtle text-[color:var(--muted)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden>
              <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            </svg>
          </span>
          <p className="mt-3 max-w-[15rem] text-sm text-[color:var(--muted)]">
            {t("knowledge.sources.picker.selectedEmpty")}
          </p>
        </div>
      ) : (
        <>
          <p className="border-b border-border px-5 py-2 text-xs text-[color:var(--muted)]">
            {t("knowledge.sources.picker.selectedSummary", {
              folders: folderCount,
              files: fileCount,
            })}
          </p>
          <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
            {items.map((entry) => (
              <li key={entry.path} className="flex items-start gap-2 px-4 py-2.5">
                <span className="mt-0.5 shrink-0 rounded bg-background-subtle px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                  {entry.kind === "folder"
                    ? t("knowledge.sources.picker.kindFolder")
                    : t("knowledge.sources.picker.kindFile")}
                </span>
                <span className="min-w-0 flex-1 break-all font-mono text-xs leading-relaxed">
                  {entry.path}
                </span>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => remove(entry.path, entry.kind)}
                    aria-label={t("knowledge.sources.picker.remove")}
                    className="shrink-0 rounded-md px-1.5 py-0.5 text-xs font-medium text-red-600 transition hover:bg-red-50 active:scale-95 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    ✕
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      <footer className="border-t border-border p-4">
        <KnowledgeSyncButton
          canSync={canEdit}
          configured={configured}
          hasSelections={items.length > 0}
          additions={preview?.additions ?? null}
          removals={preview?.removals ?? null}
          perRun={preview?.perRun ?? null}
          estimatedCostUsd={preview?.estimatedCostUsd ?? null}
          estimatedCostUsdTotal={preview?.estimatedCostUsdTotal ?? null}
          previewLoading={previewLoading}
          fullWidth
        />
      </footer>
    </div>
  );
}
