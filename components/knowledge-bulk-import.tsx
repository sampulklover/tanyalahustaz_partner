"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  bulkImportKnowledgeArticles,
  getKnowledgeEmbedJobStatus,
} from "@/app/actions/knowledge-admin";
import {
  IMPORT_CSV_TEMPLATE,
  IMPORT_JSON_TEMPLATE,
  IMPORT_MARKDOWN_TEMPLATE,
  parseImportFile,
  parseMarkdownBundle,
  type BulkImportDuplicateStrategy,
  type BulkImportResult,
  type KnowledgeImportRow,
  type ParsedImportRow,
} from "@/lib/knowledge-import";

const inputClass =
  "rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30";

type ImportState = {
  error?: string;
  result?: BulkImportResult;
};

function downloadTemplate(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function summarizeRows(rows: ParsedImportRow[]) {
  const valid = rows.filter((row) => row.row);
  const invalid = rows.filter((row) => !row.row);
  return { valid, invalid };
}

export function KnowledgeBulkImport() {
  const [parsedRows, setParsedRows] = useState<ParsedImportRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [defaultPublished, setDefaultPublished] = useState(true);
  const [embedAfterImport, setEmbedAfterImport] = useState(true);
  const [duplicateStrategy, setDuplicateStrategy] =
    useState<BulkImportDuplicateStrategy>("skip");
  const [importState, setImportState] = useState<ImportState>({});
  const [embedJob, setEmbedJob] = useState<{
    id: string;
    status: string;
    articles_processed: number;
    articles_total: number;
    chunks_written: number;
    error?: string | null;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const { valid, invalid } = useMemo(() => summarizeRows(parsedRows), [parsedRows]);
  const previewRows = valid.slice(0, 8);

  useEffect(() => {
    if (!embedJob || embedJob.status === "completed" || embedJob.status === "failed") {
      return;
    }

    const interval = window.setInterval(() => {
      void getKnowledgeEmbedJobStatus(embedJob.id).then((response) => {
        if (response.job) {
          setEmbedJob({
            id: response.job.id,
            status: response.job.status,
            articles_processed: response.job.articles_processed,
            articles_total: response.job.articles_total,
            chunks_written: response.job.chunks_written,
            error: response.job.error,
          });
        }
      });
    }, 3000);

    return () => window.clearInterval(interval);
  }, [embedJob]);

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;

    setImportState({});
    setParseError(null);

    const markdownFiles = list.filter((file) => /\.(md|markdown)$/i.test(file.name));
    if (markdownFiles.length > 1 || (markdownFiles.length === 1 && list.length === 1)) {
      const bundle = await Promise.all(
        markdownFiles.map(async (file) => ({
          name: file.name,
          content: await file.text(),
        })),
      );
      const rows = parseMarkdownBundle(bundle, defaultPublished);
      setParsedRows(rows);
      setFileName(
        markdownFiles.length === 1 ? markdownFiles[0].name : `${markdownFiles.length} markdown files`,
      );
      return;
    }

    const file = list[0];
    const text = await file.text();
    const rows = parseImportFile(file.name, text, defaultPublished);
    setParsedRows(rows);
    setFileName(file.name);
  }

  function handleImport() {
    const rows = valid
      .map((entry) => entry.row)
      .filter((row): row is KnowledgeImportRow => Boolean(row));

    startTransition(async () => {
      const response = await bulkImportKnowledgeArticles(rows, {
        defaultPublished,
        embedAfterImport,
        duplicateStrategy,
      });

      if (response.error && !response.result) {
        setImportState({ error: response.error });
        return;
      }

      setImportState({
        error: response.error,
        result: response.result,
      });

      if (response.result?.embedJobId) {
        const jobStatus = await getKnowledgeEmbedJobStatus(response.result.embedJobId);
        if (jobStatus.job) {
          setEmbedJob({
            id: jobStatus.job.id,
            status: jobStatus.job.status,
            articles_processed: jobStatus.job.articles_processed,
            articles_total: jobStatus.job.articles_total,
            chunks_written: jobStatus.job.chunks_written,
            error: jobStatus.job.error,
          });
        }
      }

      if (response.result && response.result.failed.length === 0) {
        setParsedRows([]);
        setFileName(null);
      }
    });
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Upload file</h2>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Import many articles at once from JSON, CSV, or Markdown with frontmatter. Markdown
          files can be dropped in bulk.
        </p>

        <label
          htmlFor="knowledge-import-file"
          className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-background-subtle px-6 py-12 text-center transition hover:border-brand-400 hover:bg-brand-50/40 dark:hover:bg-brand-900/10"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            void handleFiles(event.dataTransfer.files);
          }}
        >
          <span className="text-sm font-medium">Drop files here or click to browse</span>
          <span className="mt-1 text-xs text-[color:var(--muted)]">
            .json, .csv, .md — up to 500 articles per import
          </span>
          <input
            id="knowledge-import-file"
            type="file"
            accept=".json,.csv,.md,.markdown,application/json,text/csv,text/markdown"
            multiple
            className="sr-only"
            onChange={(event) => {
              if (event.target.files) {
                void handleFiles(event.target.files);
              }
            }}
          />
        </label>

        {fileName && (
          <p className="mt-4 text-sm text-[color:var(--muted)]">
            Loaded <span className="font-medium text-foreground">{fileName}</span> —{" "}
            {valid.length} valid, {invalid.length} invalid
          </p>
        )}
        {parseError && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {parseError}
          </p>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Import options</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Duplicate slugs</span>
            <select
              value={duplicateStrategy}
              onChange={(event) =>
                setDuplicateStrategy(event.target.value as BulkImportDuplicateStrategy)
              }
              className={`${inputClass} w-full`}
            >
              <option value="skip">Skip existing articles</option>
              <option value="update">Update existing articles</option>
            </select>
          </label>

          <div className="space-y-3">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-background-subtle p-4">
              <input
                type="checkbox"
                checked={defaultPublished}
                onChange={(event) => setDefaultPublished(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border text-brand-600 focus:ring-brand-500"
              />
              <span>
                <span className="block text-sm font-medium">Publish by default</span>
                <span className="mt-0.5 block text-xs text-[color:var(--muted)]">
                  Used when a row does not specify published
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-background-subtle p-4">
              <input
                type="checkbox"
                checked={embedAfterImport}
                onChange={(event) => setEmbedAfterImport(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border text-brand-600 focus:ring-brand-500"
              />
              <span>
                <span className="block text-sm font-medium">Embed after import</span>
                <span className="mt-0.5 block text-xs text-[color:var(--muted)]">
                  Generate vector chunks for published articles (recommended)
                </span>
              </span>
            </label>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Templates</h2>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              Download a starter file and replace with your content.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => downloadTemplate("knowledge-import.json", IMPORT_JSON_TEMPLATE)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition hover:bg-background-subtle"
            >
              JSON template
            </button>
            <button
              type="button"
              onClick={() => downloadTemplate("knowledge-import.csv", IMPORT_CSV_TEMPLATE)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition hover:bg-background-subtle"
            >
              CSV template
            </button>
            <button
              type="button"
              onClick={() =>
                downloadTemplate("knowledge-import.md", IMPORT_MARKDOWN_TEMPLATE)
              }
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition hover:bg-background-subtle"
            >
              Markdown template
            </button>
          </div>
        </div>
      </section>

      {invalid.length > 0 && (
        <section className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/30">
          <h2 className="text-lg font-semibold text-red-800 dark:text-red-200">
            Validation errors ({invalid.length})
          </h2>
          <ul className="mt-4 space-y-2 text-sm text-red-700 dark:text-red-300">
            {invalid.slice(0, 20).map((row) => (
              <li key={`${row.index}-${row.error}`}>
                Row {row.index}
                {row.source ? ` (${row.source})` : ""}: {row.error}
              </li>
            ))}
            {invalid.length > 20 && (
              <li>…and {invalid.length - 20} more validation errors</li>
            )}
          </ul>
        </section>
      )}

      {valid.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold">Preview</h2>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              Showing {previewRows.length} of {valid.length} valid article(s).
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-background-subtle text-xs uppercase tracking-wide text-[color:var(--muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Slug</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {previewRows.map((entry) => (
                  <tr key={`${entry.index}-${entry.row?.slug}`}>
                    <td className="px-4 py-3 font-medium">{entry.row?.title}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[color:var(--muted)]">
                      {entry.row?.slug}
                    </td>
                    <td className="px-4 py-3">{entry.row?.category}</td>
                    <td className="px-4 py-3">
                      {entry.row?.published ? "Published" : "Draft"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {importState.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {importState.error}
        </p>
      )}

      {importState.result && (
        <section className="rounded-xl border border-brand-200 bg-brand-50 p-6 dark:border-brand-900 dark:bg-brand-900/20">
          <h2 className="text-lg font-semibold text-brand-900 dark:text-brand-100">
            Import complete
          </h2>
          <ul className="mt-3 space-y-1 text-sm text-brand-800 dark:text-brand-200">
            <li>{importState.result.imported} article(s) created</li>
            <li>{importState.result.updated} article(s) updated</li>
            <li>{importState.result.skipped} duplicate(s) skipped</li>
            {importState.result.embedded > 0 && (
              <li>
                {importState.result.embedded} article(s) embedded (
                {importState.result.chunksWritten} chunk(s))
              </li>
            )}
            {importState.result.embedQueued && (
              <li>Embedding queued for background processing</li>
            )}
          </ul>
          {embedJob && (
            <div className="mt-4 rounded-lg border border-brand-300/60 bg-white/60 px-4 py-3 text-sm dark:bg-black/20">
              <p className="font-medium text-brand-900 dark:text-brand-100">
                Embedding job: {embedJob.status}
              </p>
              <p className="mt-1 text-brand-800 dark:text-brand-200">
                {embedJob.articles_processed} / {embedJob.articles_total} articles processed ·{" "}
                {embedJob.chunks_written} chunk(s) written
              </p>
              {embedJob.error && (
                <p className="mt-2 text-red-700 dark:text-red-300">{embedJob.error}</p>
              )}
            </div>
          )}
          {importState.result.failed.length > 0 && (
            <ul className="mt-4 space-y-1 text-sm text-red-700 dark:text-red-300">
              {importState.result.failed.map((failure) => (
                <li key={`${failure.index}-${failure.title}`}>
                  Row {failure.index} ({failure.title}): {failure.error}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-6">
        <button
          type="button"
          disabled={isPending || valid.length === 0}
          onClick={handleImport}
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {isPending
            ? "Importing…"
            : `Import ${valid.length} article${valid.length === 1 ? "" : "s"}`}
        </button>
        <Link
          href="/dashboard/knowledge"
          className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium transition hover:bg-background-subtle"
        >
          Back to articles
        </Link>
      </div>
    </div>
  );
}
