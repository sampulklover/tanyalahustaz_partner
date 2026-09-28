"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";

export function KnowledgeEmbedButton({
  canProcess,
  pending,
}: {
  canProcess: boolean;
  pending: number;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [result, setResult] = useState<{ chunksWritten: number; pending: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!canProcess) return null;

  async function process() {
    setIsPending(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/knowledge/sources/embed", { method: "POST" });
      const payload = (await response.json().catch(() => null)) as
        | { chunksWritten?: number; pending?: number; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? t("knowledge.sources.embedFailed"));
      }

      setResult({ chunksWritten: payload?.chunksWritten ?? 0, pending: payload?.pending ?? 0 });
      router.refresh();
    } catch (processError) {
      setError(
        processError instanceof Error ? processError.message : t("knowledge.sources.embedFailed"),
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void process();
        }}
      >
        <button
          type="submit"
          disabled={isPending || pending === 0}
          title={
            pending === 0
              ? t("knowledge.sources.embedUpToDate")
              : t("knowledge.sources.embedPending", { count: pending })
          }
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium transition hover:bg-background-subtle active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
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
          {isPending ? t("knowledge.sources.embedProcessing") : t("knowledge.sources.embedProcess")}
          {!isPending && pending > 0 && (
            <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
              {pending}
            </span>
          )}
        </button>
      </form>

      {error && (
        <p className="max-w-sm rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {result && (
        <p className="text-xs text-[color:var(--muted)]">
          {result.pending > 0
            ? t("knowledge.sources.embedPartial", {
                chunks: result.chunksWritten,
                count: result.pending,
              })
            : t("knowledge.sources.embedDone", { chunks: result.chunksWritten })}
        </p>
      )}
    </div>
  );
}
