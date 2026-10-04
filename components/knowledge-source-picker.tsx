import Link from "next/link";
import { KnowledgeSelectAll } from "@/components/knowledge-select-all";
import { KnowledgeSelectedSources } from "@/components/knowledge-selected-sources";
import { KnowledgeSourceToggle } from "@/components/knowledge-source-toggle";
import { formatBytes } from "@/lib/format-bytes";
import { getTranslations } from "@/lib/i18n/server";
import { isPathSynced, syncedCountUnder } from "@/lib/sync-path";

export type SourceSelection = { path: string; kind: "file" | "folder" };
export type SourceFolder = { name: string; path: string };
export type SourceFile = { name: string; path: string; size: number };

function parentPath(prefix: string | null) {
  if (!prefix) return null;
  const parts = prefix.split("/");
  parts.pop();
  return parts.length ? parts.join("/") : null;
}

function SearchIcon({ className = "left-3" }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
      className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-[color:var(--muted)] ${className}`}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3-3" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden className="shrink-0 text-[color:var(--muted)]">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden className="shrink-0 text-[color:var(--muted)]">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </svg>
  );
}

function SyncedPill({ label }: { label: string }) {
  return (
    <span className="flex h-5 shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M20 6 9 17l-5-5" />
      </svg>
      {label}
    </span>
  );
}

function ChevronRight() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0 text-[color:var(--muted)]">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export async function KnowledgeSourcePicker({
  configured,
  selections,
  prefix,
  folders,
  files,
  filter,
  totalCount,
  truncated,
  error,
  search,
  searchResults,
  searchTotal,
  searchTruncated,
  syncedPaths = [],
  view = "sync",
  canEdit = true,
}: {
  configured: boolean;
  selections: SourceSelection[];
  prefix: string | null;
  folders: SourceFolder[];
  files: SourceFile[];
  filter: string;
  totalCount: number;
  truncated: boolean;
  error?: string | null;
  search: string;
  searchResults: SourceFile[];
  searchTotal: number;
  searchTruncated: boolean;
  /** Source paths already mirrored, so the UI can flag what is synced. */
  syncedPaths?: string[];
  /** Which sub-tab is showing, so navigation links keep you in Sync. */
  view?: "sync" | "files";
  canEdit?: boolean;
}) {
  const t = await getTranslations();
  const syncedSet = new Set(syncedPaths);

  /** How many already-synced files live under this folder. */
  function syncedCountFor(folderPath: string) {
    return syncedCountUnder(folderPath, syncedPaths);
  }

  /**
   * A path is mirrored if it is itself synced, or sits under a synced ancestor
   * folder. Mirrored rows show a badge instead of a checkbox.
   */
  function isSynced(path: string) {
    return isPathSynced(path, syncedSet);
  }

  /** Direct link to view the real bucket file (opens in a new tab). */
  function fileHref(path: string) {
    return `/api/knowledge/sources/file?path=${encodeURIComponent(path)}`;
  }

  function browseHref(path: string | null) {
    const params = new URLSearchParams();
    if (view === "sync") params.set("view", "sync");
    if (path) params.set("browse", path);
    const query = params.toString();
    return query ? `/dashboard/knowledge/sources?${query}` : "/dashboard/knowledge/sources";
  }
  const selectedPaths = new Set(selections.map((entry) => entry.path));
  const breadcrumbs = prefix ? prefix.split("/") : [];
  const up = parentPath(prefix);
  const searching = search.trim().length >= 2;
  const rowBase = "flex items-center gap-3 px-3 py-2.5 transition hover:bg-background-subtle";
  const selectedRowBase = "bg-brand-50 dark:bg-brand-900/20";

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <div className="flex max-h-[min(26rem,calc(100dvh_-_30rem))] min-h-[12rem] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="shrink-0 border-b border-border px-5 py-4">
            <h3 className="font-semibold">{t("knowledge.sources.picker.browseTitle")}</h3>
            <p className="mt-1 text-xs leading-relaxed text-[color:var(--muted)]">
              {t("knowledge.sources.picker.browseHint")}
            </p>

            {configured && (
              <form method="get" className="mt-3 flex items-center gap-2">
                {view === "sync" && <input type="hidden" name="view" value="sync" />}
                <div className="relative flex-1">
                  <SearchIcon />
                  <input
                    type="search"
                    name="search"
                    defaultValue={search}
                    placeholder={t("knowledge.sources.picker.searchAllPlaceholder")}
                    className="w-full rounded-lg border border-border bg-background-subtle py-2 pl-9 pr-3 text-sm outline-none transition focus:border-brand-500 focus:bg-card"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium transition hover:bg-background-subtle active:scale-[0.98]"
                >
                  {t("common.search")}
                </button>
                {searching && (
                  <Link
                    href={browseHref(null)}
                    className="text-sm text-[color:var(--muted)] transition hover:text-foreground"
                  >
                    {t("common.clear")}
                  </Link>
                )}
              </form>
            )}
          </div>

          {!configured ? (
            <p className="flex flex-1 items-center justify-center px-5 text-center text-sm text-[color:var(--muted)]">
              {t("knowledge.sources.picker.notConfigured")}
            </p>
          ) : searching ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <p className="shrink-0 border-b border-border bg-background-subtle px-5 py-2 text-xs tabular-nums text-[color:var(--muted)]">
                {t("knowledge.sources.picker.searchResults", { total: searchTotal })}
              </p>
              {searchResults.length === 0 ? (
                <p className="flex flex-1 items-center justify-center px-5 text-center text-sm text-[color:var(--muted)]">
                  {t("knowledge.sources.picker.noMatches", { query: search })}
                </p>
              ) : (
                <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto pb-1">
                  {searchResults.map((file) => {
                    const selected = selectedPaths.has(file.path);
                    const synced = isSynced(file.path);
                    return (
                      <li
                        key={file.path}
                        className={`flex items-center gap-3 px-3 py-2.5 transition hover:bg-background-subtle ${
                          selected && !synced ? selectedRowBase : ""
                        }`}
                      >
                        {synced ? (
                          <SyncedPill label={t("knowledge.sources.picker.syncedBadge")} />
                        ) : (
                          <KnowledgeSourceToggle path={file.path} kind="file" selected={selected} />
                        )}
                        <a
                          href={fileHref(file.path)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={t("knowledge.sources.picker.openFile")}
                          className="group flex min-w-0 flex-1 items-center gap-2"
                        >
                          <FileIcon />
                          <span className="truncate font-mono text-xs group-hover:underline" title={file.path}>
                            {file.path}
                          </span>
                        </a>
                        <span className="shrink-0 rounded-full bg-background-subtle px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                          {formatBytes(file.size)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
              {searchTruncated && (
                <p className="border-t border-border px-5 py-3 text-xs text-[color:var(--muted)]">
                  {t("knowledge.sources.picker.searchTruncated", { shown: searchResults.length })}
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="flex shrink-0 items-center gap-2 border-b border-border bg-background-subtle px-3 py-2 text-xs">
                <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
                  {prefix && (
                    <Link
                      href={browseHref(up)}
                      className="mr-1 inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 font-medium text-[color:var(--muted)] transition hover:bg-card hover:text-foreground"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                      {t("knowledge.sources.picker.up")}
                    </Link>
                  )}
                  <Link
                    href={browseHref(null)}
                    className={
                      prefix
                        ? "shrink-0 rounded-md px-2 py-1 font-medium text-brand-600 transition hover:bg-card dark:text-brand-500"
                        : "shrink-0 rounded-md px-2 py-1 font-semibold text-foreground"
                    }
                  >
                    {t("knowledge.sources.picker.root")}
                  </Link>
                  {breadcrumbs.map((crumb, index) => {
                    const crumbPath = breadcrumbs.slice(0, index + 1).join("/");
                    const isLast = index === breadcrumbs.length - 1;
                    return (
                      <span key={crumbPath} className="flex shrink-0 items-center gap-1">
                        <span className="text-[color:var(--muted)]">/</span>
                        {isLast ? (
                          <span className="max-w-[14rem] truncate px-2 py-1 font-semibold text-foreground">
                            {crumb}
                          </span>
                        ) : (
                          <Link
                            href={browseHref(crumbPath)}
                            className="max-w-[14rem] truncate rounded-md px-2 py-1 font-medium text-brand-600 transition hover:bg-card dark:text-brand-500"
                          >
                            {crumb}
                          </Link>
                        )}
                      </span>
                    );
                  })}
                </div>

                <form method="get" className="relative shrink-0">
                  {view === "sync" && <input type="hidden" name="view" value="sync" />}
                  {prefix && <input type="hidden" name="browse" value={prefix} />}
                  <SearchIcon className="left-2" />
                  <input
                    type="search"
                    name="filter"
                    defaultValue={filter}
                    placeholder={t("knowledge.sources.picker.filterPlaceholder")}
                    className="w-40 rounded-md border border-border bg-card py-1 pl-7 pr-2 text-xs outline-none transition focus:border-brand-500 sm:w-48"
                  />
                </form>
                {filter && (
                  <Link
                    href={browseHref(prefix)}
                    aria-label={t("common.clear")}
                    className="shrink-0 rounded-md px-1.5 py-1 text-xs text-[color:var(--muted)] transition hover:bg-card hover:text-foreground"
                  >
                    ✕
                  </Link>
                )}
              </div>

              <div className="flex shrink-0 items-center justify-end border-b border-border px-3 py-1.5">
                <KnowledgeSelectAll
                  items={[
                    ...folders.map((folder) => ({ path: folder.path, kind: "folder" as const })),
                    ...files
                      .filter((file) => !isSynced(file.path))
                      .map((file) => ({ path: file.path, kind: "file" as const })),
                  ]}
                />
              </div>

              {filter && !error && (
                <p className="border-b border-border px-5 py-2 text-xs tabular-nums text-[color:var(--muted)]">
                  {t("knowledge.sources.picker.filterCount", {
                    shown: folders.length + files.length,
                    total: totalCount,
                  })}
                </p>
              )}

              {error ? (
                <p className="flex flex-1 items-center justify-center px-5 text-center text-sm text-red-600 dark:text-red-400">{error}</p>
              ) : folders.length === 0 && files.length === 0 ? (
                <p className="flex flex-1 items-center justify-center px-5 text-center text-sm text-[color:var(--muted)]">
                  {filter
                    ? t("knowledge.sources.picker.noMatches", { query: filter })
                    : t("knowledge.sources.picker.emptyFolder")}
                </p>
              ) : (
                <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto pb-1">
                  {folders.map((folder) => {
                    const selected = selectedPaths.has(folder.path);
                    return (
                      <li
                        key={folder.path}
                        className={`${rowBase} ${selected ? selectedRowBase : ""}`}
                      >
                        <KnowledgeSourceToggle path={folder.path} kind="folder" selected={selected} />
                        <Link
                          href={browseHref(folder.path)}
                          className="group flex min-w-0 flex-1 items-center gap-2"
                        >
                          <FolderIcon />
                          <span className="truncate text-sm font-medium group-hover:underline">
                            {folder.name}
                          </span>
                          <span className="ml-auto flex shrink-0 items-center gap-2">
                            {(() => {
                              const synced = syncedCountFor(folder.path);
                              return synced > 0 ? (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                  {t("knowledge.sources.picker.syncedCountBadge", { count: synced })}
                                </span>
                              ) : null;
                            })()}
                            <span className="text-[color:var(--muted)] opacity-0 transition group-hover:opacity-100">
                              <ChevronRight />
                            </span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                  {files.map((file) => {
                    const selected = selectedPaths.has(file.path);
                    const synced = isSynced(file.path);
                    return (
                      <li key={file.path} className={`${rowBase} ${selected && !synced ? selectedRowBase : ""}`}>
                        {synced ? (
                          <SyncedPill label={t("knowledge.sources.picker.syncedBadge")} />
                        ) : (
                          <KnowledgeSourceToggle path={file.path} kind="file" selected={selected} />
                        )}
                        <a
                          href={fileHref(file.path)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={t("knowledge.sources.picker.openFile")}
                          className="group flex min-w-0 flex-1 items-center gap-2"
                        >
                          <FileIcon />
                          <span className="truncate text-sm group-hover:underline">{file.name}</span>
                        </a>
                        <span className="shrink-0 rounded-full bg-background-subtle px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                          {formatBytes(file.size)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}

              {truncated && !error && (
                <p className="border-t border-border px-5 py-3 text-xs text-[color:var(--muted)]">
                  {t("knowledge.sources.picker.truncated")}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <aside className="h-full lg:col-span-2">
        <KnowledgeSelectedSources
          initialSelections={selections}
          syncedPaths={syncedPaths}
          canEdit={canEdit}
          configured={configured}
        />
      </aside>
    </div>
  );
}
