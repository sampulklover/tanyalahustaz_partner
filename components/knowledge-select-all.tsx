"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { selectSourcePaths } from "@/app/actions/knowledge-sources";
import { useI18n } from "@/lib/i18n/client";
import { emitSourceSelection } from "@/lib/selection-events";

/**
 * Ticks every item currently listed (files and folders), in one request.
 */
export function KnowledgeSelectAll({
  items,
}: {
  items: { path: string; kind: "file" | "folder" }[];
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (items.length === 0) return null;

  function selectAll() {
    setError(null);

    // Update the panel immediately.
    for (const item of items) {
      emitSourceSelection({ type: "set", path: item.path, kind: item.kind, selected: true });
    }

    startTransition(async () => {
      try {
        await selectSourcePaths(items);
      } catch (selectionError) {
        setError(selectionError instanceof Error ? selectionError.message : t("knowledge.sources.selectAllFailed"));
      } finally {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={selectAll}
        disabled={isPending}
        className="rounded-md px-2 py-1 text-xs font-medium text-brand-600 transition hover:bg-background-subtle disabled:opacity-60 dark:text-brand-500"
      >
        {isPending
          ? t("knowledge.sources.selecting")
          : t("knowledge.sources.selectAll", { count: items.length })}
      </button>
      {error && <span className="text-[11px] text-red-600 dark:text-red-400">{error}</span>}
    </div>
  );
}
