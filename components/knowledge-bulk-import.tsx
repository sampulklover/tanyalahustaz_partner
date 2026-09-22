"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState, useTransition } from "react";
import {
  bulkImportKnowledgeArticles,
  getKnowledgeEmbedJobStatus,
} from "@/app/actions/knowledge-admin";
import {
  IMPORT_CSV_TEMPLATE,
  IMPORT_JSON_TEMPLATE,
  IMPORT_MARKDOWN_TEMPLATE,
  MAX_DOCUMENT_FILES,
  MAX_TOTAL_UPLOAD_BYTES,
  isDocumentFilename,
  parseImportFile,
  parseMarkdownBundle,
  reindexImportRows,
  validateImportRow,
  type BulkImportDuplicateStrategy,
  type BulkImportResult,
  type DocumentExtractResult,
  type KnowledgeImportRow,
  type ParsedImportRow,
} from "@/lib/knowledge-import";
import { requestDocumentArticles } from "@/lib/knowledge-upload";
import { useI18n } from "@/lib/i18n/client";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30";

type ImportState = {
  error?: string;
  result?: BulkImportResult;
};

type DocumentStatus = {
  processing: boolean;
  total: number;
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
  const editable = rows.filter((row) => row.row);
  const valid = rows.filter((row) => row.row && !row.error);
  const invalid = rows.filter((row) => !row.row || row.error);
  return { editable, valid, invalid };
}

export function KnowledgeBulkImport() {
  const { t } = useI18n();
  const [parsedRows, setParsedRows] = useState<ParsedImportRow[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [documentStatus, setDocumentStatus] = useState<DocumentStatus>({
    processing: false,
    total: 0,
  });
  const [documentNotes, setDocumentNotes] = useState<DocumentExtractResult[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
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

  const { editable, valid, invalid } = useMemo(() => summarizeRows(parsedRows), [parsedRows]);

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

  function mergeRows(rows: ParsedImportRow[]) {
    setParsedRows((previous) => reindexImportRows([...previous, ...rows]));
  }

  async function processDocuments(files: File[]): Promise<boolean> {
    if (files.length > MAX_DOCUMENT_FILES) {
      setParseError(t("knowledge.bulkImport.tooManyDocuments", { count: MAX_DOCUMENT_FILES }));
      return false;
    }

    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > MAX_TOTAL_UPLOAD_BYTES) {
      setParseError(
        t("knowledge.bulkImport.documentTooLarge", {
          size: Math.round(MAX_TOTAL_UPLOAD_BYTES / 1024 / 1024),
        }),
      );
      return false;
    }

    setDocumentStatus({ processing: true, total: files.length });

    try {
      const results = await requestDocumentArticles(files, defaultPublished);
      const rows: ParsedImportRow[] = [];

      for (const result of results) {
        if (result.row) {
          rows.push({ index: 0, source: result.name, row: result.row });
        }
      }

      mergeRows(rows);
      setDocumentNotes(results);
      return true;
    } catch (error) {
      setParseError(
        error instanceof Error ? error.message : t("knowledge.bulkImport.documentFailed"),
      );
      return false;
    } finally {
      setDocumentStatus({ processing: false, total: 0 });
    }
  }

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;

    setImportState({});
    setParseError(null);
    setDocumentNotes([]);

    const documentFiles = list.filter((file) => isDocumentFilename(file.name));
    const structuredFiles = list.filter((file) => !isDocumentFilename(file.name));

    if (structuredFiles.length > 0) {
      const nextRows: ParsedImportRow[] = [];

      const allMarkdown = structuredFiles.every((file) => /\.(md|markdown)$/i.test(file.name));
      if (allMarkdown) {
        const bundle = await Promise.all(
          structuredFiles.map(async (file) => ({
            name: file.name,
            content: await file.text(),
          })),
        );
        nextRows.push(...parseMarkdownBundle(bundle, defaultPublished));
      } else {
        for (const file of structuredFiles) {
          nextRows.push(...parseImportFile(file.name, await file.text(), defaultPublished));
        }
      }

      mergeRows(nextRows);
    }

    const structuredNames = structuredFiles.map((file) => file.name);
    if (structuredNames.length > 0) {
      setFileNames((previous) => [...previous, ...structuredNames]);
    }

    if (documentFiles.length > 0) {
      const processed = await processDocuments(documentFiles);
      if (processed) {
        setFileNames((previous) => [
          ...previous,
          ...documentFiles.map((file) => file.name),
        ]);
      }
    }
  }

  function updateRow(index: number, patch: Partial<KnowledgeImportRow>) {
    setParsedRows((previous) =>
      previous.map((entry) => {
        if (entry.index !== index || !entry.row) return entry;
        const next = { ...entry.row, ...patch };
        const result = validateImportRow(next, index, {
          defaultPublished,
          source: entry.source,
        });
        // Keep the values the user typed so the row stays visible and editable
        // even while a field is temporarily invalid.
        return result.row ? result : { ...result, row: next };
      }),
    );
  }

  function toggleExpanded(index: number) {
    setExpandedRows((previous) => {
      const next = new Set(previous);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
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
        setFileNames([]);
        setDocumentNotes([]);
        setExpandedRows(new Set());
      }
    });
  }

  const documentFailures = documentNotes.filter((note) => !note.row && note.error);
  const documentWarnings = documentNotes.filter((note) => note.row && note.warning);
  const structuredFileCount = fileNames.length;

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">{t("knowledge.bulkImport.uploadTitle")}</h2>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          {t("knowledge.bulkImport.uploadDescription")}
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
          <span className="text-sm font-medium">{t("knowledge.bulkImport.dropFiles")}</span>
          <span className="mt-1 text-xs text-[color:var(--muted)]">
            {t("knowledge.bulkImport.fileTypes")}
          </span>
          <input
            id="knowledge-import-file"
            type="file"
            accept=".json,.csv,.md,.markdown,.pdf,.docx,.txt,application/json,text/csv,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            multiple
            className="sr-only"
            onChange={(event) => {
              if (event.target.files) {
                void handleFiles(event.target.files);
                event.target.value = "";
              }
            }}
          />
        </label>
        <p className="mt-4 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800 dark:border-brand-900 dark:bg-brand-900/20 dark:text-brand-200">
          {t("knowledge.bulkImport.documentHint")}
        </p>

        {documentStatus.processing && (
          <p className="mt-4 text-sm font-medium text-brand-700 dark:text-brand-300">
            {t("knowledge.bulkImport.processingDocuments", { count: documentStatus.total })}
          </p>
        )}

        {structuredFileCount > 0 && (
          <p className="mt-4 text-sm text-[color:var(--muted)]">
            {t("knowledge.bulkImport.loaded", {
              fileName: fileNames.join(", "),
              valid: valid.length,
              invalid: invalid.length,
            })}
          </p>
        )}

        {parseError && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {parseError}
          </p>
        )}
      </section>

      {(documentFailures.length > 0 || documentWarnings.length > 0) && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950/20">
          {documentFailures.length > 0 && (
            <>
              <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-100">
                {t("knowledge.bulkImport.documentErrorsTitle")}
              </h2>
              <ul className="mt-3 space-y-2 text-sm text-amber-800 dark:text-amber-200">
                {documentFailures.map((note) => (
                  <li key={note.name}>
                    {t("knowledge.bulkImport.documentError", {
                      name: note.name,
                      error: note.error ?? "",
                    })}
                  </li>
                ))}
              </ul>
            </>
          )}
          {documentWarnings.length > 0 && (
            <ul className="mt-4 space-y-2 text-sm text-amber-800 dark:text-amber-200">
              {documentWarnings.map((note) => (
                <li key={note.name}>
                  {t("knowledge.bulkImport.documentWarning", {
                    name: note.name,
                    warning: note.warning ?? "",
                  })}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">{t("knowledge.bulkImport.optionsTitle")}</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">{t("knowledge.bulkImport.duplicateSlugs")}</span>
            <select
              value={duplicateStrategy}
              onChange={(event) =>
                setDuplicateStrategy(event.target.value as BulkImportDuplicateStrategy)
              }
              className={`${inputClass} w-full`}
            >
              <option value="skip">{t("knowledge.bulkImport.skipExisting")}</option>
              <option value="update">{t("knowledge.bulkImport.updateExisting")}</option>
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
                <span className="block text-sm font-medium">{t("knowledge.bulkImport.publishByDefault")}</span>
                <span className="mt-0.5 block text-xs text-[color:var(--muted)]">
                  {t("knowledge.bulkImport.publishByDefaultHelp")}
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
                <span className="block text-sm font-medium">{t("knowledge.bulkImport.embedAfterImport")}</span>
                <span className="mt-0.5 block text-xs text-[color:var(--muted)]">
                  {t("knowledge.bulkImport.embedAfterImportHelp")}
                </span>
              </span>
            </label>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{t("knowledge.bulkImport.templatesTitle")}</h2>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              {t("knowledge.bulkImport.templatesDescription")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => downloadTemplate("knowledge-import.json", IMPORT_JSON_TEMPLATE)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition hover:bg-background-subtle"
            >
              {t("knowledge.bulkImport.jsonTemplate")}
            </button>
            <button
              type="button"
              onClick={() => downloadTemplate("knowledge-import.csv", IMPORT_CSV_TEMPLATE)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition hover:bg-background-subtle"
            >
              {t("knowledge.bulkImport.csvTemplate")}
            </button>
            <button
              type="button"
              onClick={() =>
                downloadTemplate("knowledge-import.md", IMPORT_MARKDOWN_TEMPLATE)
              }
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition hover:bg-background-subtle"
            >
              {t("knowledge.bulkImport.markdownTemplate")}
            </button>
          </div>
        </div>
      </section>

      {invalid.length > 0 && (
        <section className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/30">
          <h2 className="text-lg font-semibold text-red-800 dark:text-red-200">
            {t("knowledge.bulkImport.validationErrors", { count: invalid.length })}
          </h2>
          <ul className="mt-4 space-y-2 text-sm text-red-700 dark:text-red-300">
            {invalid.slice(0, 20).map((row) => (
              <li key={`${row.index}-${row.error}`}>
                {t("knowledge.bulkImport.rowError", {
                  index: row.index,
                  source: row.source ? t("knowledge.bulkImport.rowSource", { source: row.source }) : "",
                  error: row.error ?? "",
                })}
              </li>
            ))}
            {invalid.length > 20 && (
              <li>{t("knowledge.bulkImport.moreErrors", { count: invalid.length - 20 })}</li>
            )}
          </ul>
        </section>
      )}

      {editable.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold">{t("knowledge.bulkImport.previewTitle")}</h2>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              {t("knowledge.bulkImport.previewDescription", {
                shown: editable.length,
                total: valid.length,
              })}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-background-subtle text-xs uppercase tracking-wide text-[color:var(--muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("common.title")}</th>
                  <th className="px-4 py-3 font-medium">{t("common.category")}</th>
                  <th className="px-4 py-3 font-medium">{t("common.status")}</th>
                  <th className="px-4 py-3 text-right font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {editable.map((entry) => {
                  const row = entry.row as KnowledgeImportRow;
                  const expanded = expandedRows.has(entry.index);
                  return (
                    <Fragment key={entry.index}>
                      <tr className={entry.error ? "bg-red-50/60 dark:bg-red-950/20" : undefined}>
                        <td className="px-4 py-3">
                          <div className="font-medium">{row.title}</div>
                          <div className="font-mono text-xs text-[color:var(--muted)]">{row.slug}</div>
                          {entry.source && (
                            <div className="mt-0.5 text-xs text-[color:var(--muted)]">
                              {t("knowledge.bulkImport.rowSource", { source: entry.source })}
                            </div>
                          )}
                          {entry.error && (
                            <div className="mt-1 text-xs text-red-700 dark:text-red-300">
                              {entry.error}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-background-subtle px-2 py-0.5 text-xs">
                            {row.category}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {row.published ? (
                            <span className="font-medium text-brand-600 dark:text-brand-500">
                              {t("common.published")}
                            </span>
                          ) : (
                            <span className="text-[color:var(--muted)]">{t("common.draft")}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => toggleExpanded(entry.index)}
                            className="font-medium text-brand-600 hover:underline dark:text-brand-500"
                          >
                            {expanded ? t("knowledge.bulkImport.doneEditing") : t("knowledge.bulkImport.editRow")}
                          </button>
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="bg-background-subtle/60">
                          <td colSpan={4} className="px-4 py-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <label className="block text-sm md:col-span-2">
                                <span className="mb-1 block font-medium">{t("common.title")}</span>
                                <input
                                  value={row.title}
                                  onChange={(event) =>
                                    updateRow(entry.index, { title: event.target.value })
                                  }
                                  className={inputClass}
                                />
                              </label>
                              <label className="block text-sm">
                                <span className="mb-1 block font-medium">{t("common.slug")}</span>
                                <input
                                  value={row.slug}
                                  onChange={(event) =>
                                    updateRow(entry.index, { slug: event.target.value })
                                  }
                                  className={`${inputClass} font-mono`}
                                />
                              </label>
                              <label className="block text-sm">
                                <span className="mb-1 block font-medium">{t("common.category")}</span>
                                <input
                                  value={row.category}
                                  onChange={(event) =>
                                    updateRow(entry.index, { category: event.target.value })
                                  }
                                  className={inputClass}
                                />
                              </label>
                              <label className="block text-sm md:col-span-2">
                                <span className="mb-1 block font-medium">{t("common.tags")}</span>
                                <input
                                  value={row.tags.join(", ")}
                                  onChange={(event) =>
                                    updateRow(entry.index, {
                                      tags: event.target.value
                                        .split(",")
                                        .map((tag) => tag.trim())
                                        .filter(Boolean),
                                    })
                                  }
                                  className={inputClass}
                                />
                              </label>
                              <label className="block text-sm md:col-span-2">
                                <span className="mb-1 block font-medium">{t("common.summary")}</span>
                                <textarea
                                  value={row.summary}
                                  rows={3}
                                  onChange={(event) =>
                                    updateRow(entry.index, { summary: event.target.value })
                                  }
                                  className={inputClass}
                                />
                              </label>
                              <label className="block text-sm md:col-span-2">
                                <span className="mb-1 block font-medium">{t("common.content")}</span>
                                <textarea
                                  value={row.content}
                                  rows={10}
                                  onChange={(event) =>
                                    updateRow(entry.index, { content: event.target.value })
                                  }
                                  className={`${inputClass} font-mono text-[13px] leading-relaxed`}
                                />
                              </label>
                              <label className="flex cursor-pointer items-center gap-2 text-sm md:col-span-2">
                                <input
                                  type="checkbox"
                                  checked={row.published}
                                  onChange={(event) =>
                                    updateRow(entry.index, { published: event.target.checked })
                                  }
                                  className="h-4 w-4 rounded border-border text-brand-600 focus:ring-brand-500"
                                />
                                <span>{t("knowledge.bulkImport.published")}</span>
                              </label>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
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
            {t("knowledge.bulkImport.importComplete")}
          </h2>
          <ul className="mt-3 space-y-1 text-sm text-brand-800 dark:text-brand-200">
            <li>{t("knowledge.bulkImport.imported", { count: importState.result.imported })}</li>
            <li>{t("knowledge.bulkImport.updated", { count: importState.result.updated })}</li>
            <li>{t("knowledge.bulkImport.skipped", { count: importState.result.skipped })}</li>
            {importState.result.embedded > 0 && (
              <li>
                {t("knowledge.bulkImport.embedded", {
                  count: importState.result.embedded,
                  chunks: importState.result.chunksWritten,
                })}
              </li>
            )}
            {importState.result.embedQueued && (
              <li>{t("knowledge.bulkImport.embedQueued")}</li>
            )}
          </ul>
          {embedJob && (
            <div className="mt-4 rounded-lg border border-brand-300/60 bg-white/60 px-4 py-3 text-sm dark:bg-black/20">
              <p className="font-medium text-brand-900 dark:text-brand-100">
                {t("knowledge.bulkImport.embeddingJob", { status: embedJob.status })}
              </p>
              <p className="mt-1 text-brand-800 dark:text-brand-200">
                {t("knowledge.bulkImport.embeddingProgress", {
                  processed: embedJob.articles_processed,
                  total: embedJob.articles_total,
                  chunks: embedJob.chunks_written,
                })}
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
                  {t("knowledge.bulkImport.importFailed", {
                    index: failure.index,
                    title: failure.title,
                    error: failure.error,
                  })}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-6">
        <button
          type="button"
          disabled={isPending || documentStatus.processing || valid.length === 0}
          onClick={handleImport}
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {isPending
            ? t("knowledge.bulkImport.importing")
            : t("knowledge.bulkImport.importCount", { count: valid.length })}
        </button>
        <Link
          href="/dashboard/knowledge"
          className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium transition hover:bg-background-subtle"
        >
          {t("common.backToArticles")}
        </Link>
      </div>
    </div>
  );
}
