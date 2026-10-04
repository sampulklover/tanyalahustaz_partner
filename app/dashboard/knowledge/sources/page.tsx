import Link from "next/link";
import { Suspense } from "react";
import { KnowledgeActivity } from "@/components/knowledge-activity";
import { KnowledgeNav } from "@/components/knowledge-nav";
import { KnowledgeReembedButton } from "@/components/knowledge-reembed-button";
import { KnowledgeSourcePicker } from "@/components/knowledge-source-picker";
import { KnowledgeSourcesTabs } from "@/components/knowledge-sources-tabs";
import {
  KnowledgeSourcesStats,
  KnowledgeSourcesStatsSkeleton,
} from "./stats-section";
import { DashboardPage as DashboardShell } from "@/components/dashboard/page";
import { PageHeader } from "@/components/dashboard/page-header";
import { getDashboardContext } from "@/lib/dashboard";
import { formatBytes } from "@/lib/format-bytes";
import { listGcsChildren, searchGcsObjects } from "@/lib/gcs";
import { getGcsSyncStatus } from "@/lib/gcs-sync";
import { getPendingEmbedJobCount } from "@/lib/knowledge-embed-jobs";
import { logError } from "@/lib/logger";
import { sanitizeIlikeQuery } from "@/lib/sanitize";
import { createClient } from "@/lib/supabase/server";
import type { KnowledgeSyncRun } from "@/lib/types";
import { getTranslations } from "@/lib/i18n/server";

const LIBRARY_PAGE_SIZE = 50;

/** Global bucket search lists the whole bucket, so allow a longer render. */
export const maxDuration = 60;

export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t("pages.knowledge.sources.title") };
}

function statusLabel(
  t: Awaited<ReturnType<typeof getTranslations>>,
  status: KnowledgeSyncRun["status"],
) {
  if (status === "running") return t("knowledge.sources.statusRunning");
  if (status === "failed") return t("knowledge.sources.statusFailed");
  return t("knowledge.sources.statusCompleted");
}

type LibraryArticle = {
  id: string;
  title: string;
  slug: string;
  category: string;
  published: boolean;
  updated_at: string;
  source_provider: string | null;
  source_path: string | null;
  source_size: number | null;
};

export default async function KnowledgeSourcesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    browse?: string;
    filter?: string;
    search?: string;
    view?: string;
    page?: string;
  }>;
}) {
  const t = await getTranslations();
  const params = await searchParams;
  const q = sanitizeIlikeQuery(params.q ?? "");
  const context = await getDashboardContext();
  const knowledge = context!.knowledge;
  const status = getGcsSyncStatus();
  const supabase = await createClient();

  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const pageFrom = (page - 1) * LIBRARY_PAGE_SIZE;
  const pageTo = pageFrom + LIBRARY_PAGE_SIZE - 1;

  const browseRaw = params.browse?.trim() ?? "";
  const browsePrefix =
    browseRaw && !browseRaw.startsWith("/") && !browseRaw.includes("..") ? browseRaw : null;

  const search = params.search?.trim() ?? "";
  const searchingGlobally = search.length >= 2;

  let listing: Awaited<ReturnType<typeof listGcsChildren>> = {
    folders: [],
    files: [],
    truncated: false,
  };
  let browseError: string | null = null;
  let searchResults: { name: string; path: string; size: number }[] = [];
  let searchTotal = 0;
  let searchTruncated = false;

  if (status.configured) {
    try {
      if (searchingGlobally) {
        const found = await searchGcsObjects(search);
        searchResults = found.results;
        searchTotal = found.total;
        searchTruncated = found.truncated;
      } else {
        listing = await listGcsChildren(browsePrefix);
      }
    } catch (error) {
      logError("GCS browse failed", error, { prefix: browsePrefix, search });
      browseError =
        error instanceof Error ? error.message : t("knowledge.sources.picker.loadError");
    }
  }

  const filter = params.filter?.trim() ?? "";
  const filterLower = filter.toLowerCase();
  const filteredFolders = filter
    ? listing.folders.filter((folder) => folder.name.toLowerCase().includes(filterLower))
    : listing.folders;
  const filteredFiles = filter
    ? listing.files.filter((file) => file.name.toLowerCase().includes(filterLower))
    : listing.files;
  const browseTotal = listing.folders.length + listing.files.length;

  let libraryQuery = supabase
    .from("knowledge_articles")
    .select(
      "id, title, slug, category, published, updated_at, source_provider, source_path, source_size",
    )
    .order("updated_at", { ascending: false })
    .range(pageFrom, pageTo);

  let libraryCountQuery = supabase
    .from("knowledge_articles")
    .select("id", { count: "exact", head: true });

  if (q) {
    const filter = `title.ilike.%${q}%,source_path.ilike.%${q}%,category.ilike.%${q}%`;
    libraryQuery = libraryQuery.or(filter);
    libraryCountQuery = libraryCountQuery.or(filter);
  }

  const [
    { data: runs },
    { data: files },
    { count: articleCount },
    { data: selections },
    { data: mirroredPaths },
    pendingEmbedJobs,
    { count: filteredCount },
  ] = await Promise.all([
    supabase
      .from("knowledge_sync_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(10),
    libraryQuery,
    supabase.from("knowledge_articles").select("id", { count: "exact", head: true }),
    supabase
      .from("knowledge_source_selections")
      .select("path, kind")
      .eq("provider", "gcs")
      .order("path", { ascending: true }),
    supabase
      .from("knowledge_articles")
      .select("source_path")
      .eq("source_provider", "gcs")
      .not("source_path", "is", null)
      .limit(1000),
    getPendingEmbedJobCount(),
    libraryCountQuery,
  ]);

  const syncedPaths = ((mirroredPaths ?? []) as { source_path: string }[]).map(
    (row) => row.source_path,
  );

  const runItems = (runs ?? []) as KnowledgeSyncRun[];
  const libraryItems = (files ?? []) as LibraryArticle[];
  const selectionItems = (selections ?? []) as { path: string; kind: "file" | "folder" }[];
  const lastRun = runItems[0] ?? null;

  const totalForQuery = filteredCount ?? articleCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalForQuery / LIBRARY_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  // Build a querystring that keeps the current search/view but swaps the page.
  function pageHref(target: number): string {
    const sp = new URLSearchParams();
    sp.set("view", "files");
    if (params.q) sp.set("q", params.q);
    sp.set("page", String(target));
    return `/dashboard/knowledge/sources?${sp.toString()}`;
  }

  // Files is the default view, unless the library is still empty — then Sync is
  // the obvious next step.
  const view: "files" | "sync" =
    params.view === "sync"
      ? "sync"
      : params.view === "files"
        ? "files"
        : (articleCount ?? 0) === 0
          ? "sync"
          : "files";


  return (
    <DashboardShell>
      <KnowledgeNav knowledge={knowledge} active="sources" />

      <PageHeader
        title={t("pages.knowledge.sources.title")}
        description={t("pages.knowledge.sources.description")}
      />

      {!status.configured && (
        <p className="mb-10 rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm leading-relaxed text-amber-900 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
          {t("knowledge.sources.notConfiguredHelp")}
        </p>
      )}

      <Suspense
        fallback={<KnowledgeSourcesStatsSkeleton />}
      >
        <KnowledgeSourcesStats status={status} selectionCount={selectionItems.length} />
      </Suspense>


      <KnowledgeActivity
        pendingEmbedJobs={pendingEmbedJobs}
        canEdit={knowledge.canEditKnowledge}
      />

      <KnowledgeSourcesTabs
        initialView={view}
        filesView={
          <>
          <div className="mb-1 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                {t("knowledge.library.title")}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-[color:var(--muted)]">
                {t("knowledge.library.description")}
              </p>
            </div>
            {knowledge.canEditKnowledge && <KnowledgeReembedButton />}
          </div>

      <div className="mb-12 mt-4 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <form method="get" className="flex flex-1 items-center gap-2">
            <input type="hidden" name="view" value="files" />
            <div className="relative w-full max-w-md">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--muted)]"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3-3" />
              </svg>
              <input
                type="search"
                name="q"
                defaultValue={params.q ?? ""}
                placeholder={t("knowledge.library.searchPlaceholder")}
                className="w-full rounded-lg border border-border bg-background-subtle py-2 pl-9 pr-3 text-sm outline-none transition focus:border-brand-500 focus:bg-card"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium transition hover:bg-background-subtle active:scale-[0.98]"
            >
              {t("common.search")}
            </button>
            {q && (
              <Link
                href="/dashboard/knowledge/sources"
                className="text-sm text-[color:var(--muted)] transition hover:text-foreground"
              >
                {t("common.clear")}
              </Link>
            )}
          </form>
          <span className="shrink-0 text-xs tabular-nums text-[color:var(--muted)]">
            {t("knowledge.library.showing", {
              shown: libraryItems.length,
              total: totalForQuery,
            })}
          </span>
        </div>

        {libraryItems.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-[color:var(--muted)]">
            {q ? t("knowledge.library.noMatches") : t("knowledge.library.noFiles")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-background-subtle text-xs uppercase tracking-wide text-[color:var(--muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("common.title")}</th>
                  <th className="px-4 py-3 font-medium">{t("common.category")}</th>
                  <th className="px-4 py-3 font-medium">{t("knowledge.library.colSource")}</th>
                  <th className="px-4 py-3 font-medium">{t("common.status")}</th>
                  <th className="px-4 py-3 font-medium">{t("common.updated")}</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {libraryItems.map((article) => (
                  <tr key={article.id} className="transition hover:bg-background-subtle">
                    <td className="px-4 py-3">
                      <div className="font-medium">{article.title}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-[color:var(--muted)]">
                          {article.source_path ?? article.slug}
                        </span>
                        {article.source_size != null && (
                          <span className="rounded-full bg-background-subtle px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                            {formatBytes(article.source_size)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-background-subtle px-2 py-0.5 text-xs">
                        {article.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[color:var(--muted)]">
                      {article.source_provider
                        ? t("knowledge.library.sourceSynced")
                        : t("knowledge.library.sourceManual")}
                    </td>
                    <td className="px-4 py-3">
                      {article.published ? (
                        <span className="font-medium text-brand-600 dark:text-brand-500">
                          {t("common.published")}
                        </span>
                      ) : (
                        <span className="text-[color:var(--muted)]">{t("common.draft")}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-[color:var(--muted)]">
                      {new Date(article.updated_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/knowledge/${article.id}`}
                        className="font-medium text-brand-600 hover:underline dark:text-brand-500"
                      >
                        {t("common.view")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
            <span className="text-xs tabular-nums text-[color:var(--muted)]">
              {t("knowledge.library.pageOf", {
                page: currentPage,
                total: totalPages,
              })}
            </span>
            <div className="flex items-center gap-2">
              {hasPrev ? (
                <Link
                  href={pageHref(currentPage - 1)}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition hover:bg-background-subtle active:scale-[0.98]"
                >
                  {t("common.previous")}
                </Link>
              ) : (
                <span className="cursor-not-allowed rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-[color:var(--muted)] opacity-50">
                  {t("common.previous")}
                </span>
              )}
              {hasNext ? (
                <Link
                  href={pageHref(currentPage + 1)}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition hover:bg-background-subtle active:scale-[0.98]"
                >
                  {t("common.next")}
                </Link>
              ) : (
                <span className="cursor-not-allowed rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-[color:var(--muted)] opacity-50">
                  {t("common.next")}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
          </>
        }
        syncView={
          <>
          <h2 className="mb-4 text-lg font-semibold tracking-tight">
            {t("knowledge.sources.selectTitle")}
          </h2>

          <KnowledgeSourcePicker
            configured={status.configured}
            selections={selectionItems}
            prefix={browsePrefix}
            folders={filteredFolders}
            files={filteredFiles}
            filter={filter}
            totalCount={browseTotal}
            truncated={listing.truncated}
            error={browseError}
            search={search}
            searchResults={searchResults}
            searchTotal={searchTotal}
            searchTruncated={searchTruncated}
            syncedPaths={syncedPaths}
            view={view}
            canEdit={knowledge.canEditKnowledge}
          />
          <details className="group mt-10 block">

        <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl border border-border bg-card px-5 py-4 shadow-sm transition hover:border-brand-200 dark:hover:border-brand-900">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            className="shrink-0 text-[color:var(--muted)] transition group-open:rotate-90"
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
          <span className="font-semibold">{t("knowledge.sources.historyTitle")}</span>
          <span className="ml-auto text-xs text-[color:var(--muted)]">
            {lastRun
              ? t("knowledge.sources.lastRun", {
                  status: statusLabel(t, lastRun.status),
                  time: new Date(lastRun.started_at).toLocaleString(),
                })
              : t("knowledge.sources.noRuns")}
          </span>
        </summary>

        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          {runItems.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-[color:var(--muted)]">
              {t("knowledge.sources.noRuns")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-background-subtle text-xs uppercase tracking-wide text-[color:var(--muted)]">
                  <tr>
                    <th className="px-4 py-3 font-medium">{t("knowledge.sources.startedAt")}</th>
                    <th className="px-4 py-3 font-medium">{t("common.status")}</th>
                    <th className="px-4 py-3 font-medium">{t("knowledge.sources.colResult")}</th>
                    <th className="px-4 py-3 font-medium">{t("knowledge.sources.colErrors")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {runItems.map((run) => {
                    const failedCount = Array.isArray(run.failed) ? run.failed.length : 0;
                    return (
                      <tr key={run.id}>
                        <td className="px-4 py-3 tabular-nums text-[color:var(--muted)]">
                          {new Date(run.started_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={
                              run.status === "failed"
                                ? "font-medium text-red-600 dark:text-red-400"
                                : run.status === "running"
                                  ? "text-[color:var(--muted)]"
                                  : "font-medium text-brand-600 dark:text-brand-500"
                            }
                          >
                            {statusLabel(t, run.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[color:var(--muted)]">
                          {t("knowledge.sources.resultSummary", {
                            created: run.created_count,
                            updated: run.updated_count,
                            removed: run.removed_count,
                            skipped: run.skipped_count,
                            deferred: run.deferred_count,
                          })}
                        </td>
                        <td className="px-4 py-3">
                          {run.error ? (
                            <span className="text-red-600 dark:text-red-400">{run.error}</span>
                          ) : failedCount > 0 ? (
                            <span className="text-amber-700 dark:text-amber-400">
                              {t("knowledge.sources.failedCount", { count: failedCount })}
                            </span>
                          ) : (
                            <span className="text-[color:var(--muted)]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
          </details>
          </>
        }
      />
    </DashboardShell>
  );
}
