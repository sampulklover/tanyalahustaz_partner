import { countKnowledgeChunks } from "@/lib/embed-knowledge";
import { getPendingEmbedJobCount } from "@/lib/knowledge-embed-jobs";
import { createClient } from "@/lib/supabase/server";
import type { GcsSyncStatus } from "@/lib/gcs-sync";
import { getTranslations } from "@/lib/i18n/server";

/**
 * The four summary cards. The counts hit the database (and the chunk table can
 * be large), so this streams in while the rest of the page is already visible.
 */
export async function KnowledgeSourcesStats({
  status,
  selectionCount,
}: {
  status: GcsSyncStatus;
  selectionCount: number;
}) {
  const t = await getTranslations();
  const supabase = await createClient();

  const [{ count: articleCount }, chunkCount, pendingEmbedJobs] = await Promise.all([
    supabase.from("knowledge_articles").select("id", { count: "exact", head: true }),
    countKnowledgeChunks(),
    getPendingEmbedJobCount(),
  ]);

  return (
    <div className="mb-10 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border shadow-sm sm:grid-cols-2 lg:grid-cols-4">
      <div className="bg-card px-5 py-4">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
              status.configured ? "bg-emerald-500" : "bg-amber-500"
            }`}
          />
          <p className="text-sm font-semibold">
            {status.configured
              ? t("knowledge.sources.configured")
              : t("knowledge.sources.notConfigured")}
          </p>
        </div>
        <p
          className="mt-1.5 truncate font-mono text-xs text-[color:var(--muted)]"
          title={status.bucket ?? undefined}
        >
          {status.bucket ?? t("knowledge.sources.connectionTitle")}
        </p>
      </div>

      <div className="bg-card px-5 py-4">
        <p className="text-2xl font-bold tabular-nums leading-none tracking-tight">
          {selectionCount}
        </p>
        <p className="mt-1.5 text-xs text-[color:var(--muted)]">
          {selectionCount > 0
            ? t("knowledge.sources.selectedSub")
            : t("knowledge.sources.noSelection")}
        </p>
      </div>

      <div className="bg-card px-5 py-4">
        <p className="text-2xl font-bold tabular-nums leading-none tracking-tight">
          {articleCount ?? 0}
        </p>
        <p className="mt-1.5 text-xs text-[color:var(--muted)]">
          {t("knowledge.sources.filesSub")}
        </p>
      </div>

      <div className="bg-card px-5 py-4">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
              pendingEmbedJobs > 0 ? "bg-amber-500" : "bg-emerald-500"
            }`}
          />
          <p className="text-sm font-semibold">
            {pendingEmbedJobs > 0
              ? t("knowledge.sources.embeddingsPending", { count: pendingEmbedJobs })
              : chunkCount === 0
                ? t("knowledge.sources.embeddingsEmpty")
                : t("knowledge.sources.embeddingsReady")}
          </p>
        </div>
        <p className="mt-1.5 text-xs tabular-nums text-[color:var(--muted)]">
          {t("knowledge.sources.chunksSub", { count: chunkCount.toLocaleString() })}
        </p>
      </div>
    </div>
  );
}

/** Placeholder while the summary cards load. */
export function KnowledgeSourcesStatsSkeleton() {
  return (
    <div className="mb-10 grid animate-pulse grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border shadow-sm sm:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((index) => (
        <div key={index} className="h-20 bg-card" />
      ))}
    </div>
  );
}
