"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/client";

// Folder-pending requests are batched: the first badge to mount kicks off one
// request for every requested folder, and all badges share the result. This
// keeps the count off the server render (so the page paints fast) while still
// using a single Google Cloud round-trip per folder set.
const pendingCache = new Map<string, number>();
const inFlight = new Map<string, Promise<void>>();

function requestPending(paths: string[]): Promise<void> {
  const key = paths.slice().sort().join(",");
  const existing = inFlight.get(key);
  if (existing) return existing;

  const url = `/api/knowledge/sources/pending?folders=${encodeURIComponent(key)}`;
  const promise = fetch(url)
    .then((response) => response.json())
    .then((payload: { pending?: Record<string, number> } | null) => {
      for (const [path, count] of Object.entries(payload?.pending ?? {})) {
        pendingCache.set(path, count);
      }
    })
    .catch(() => {
      // Badges are optional; leave them hidden on failure.
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}

/**
 * "N to sync" badge for one folder. Counts are fetched after mount so listing
 * the bucket never delays the page's first paint.
 */
export function FolderPendingBadge({
  path,
  siblingPaths,
}: {
  path: string;
  /** All folder paths currently on screen, so one request covers them all. */
  siblingPaths: string[];
}) {
  const { t } = useI18n();
  const [count, setCount] = useState<number | null>(pendingCache.get(path) ?? null);

  useEffect(() => {
    if (pendingCache.has(path)) return;
    let cancelled = false;
    void requestPending(siblingPaths).then(() => {
      if (!cancelled) setCount(pendingCache.get(path) ?? 0);
    });
    return () => {
      cancelled = true;
    };
  }, [path, siblingPaths]);

  if (count === null || count <= 0) return null;

  return (
    <span
      className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
      title={t("knowledge.sources.picker.pendingCountTitle")}
    >
      {t("knowledge.sources.picker.pendingCountBadge", { count })}
    </span>
  );
}
