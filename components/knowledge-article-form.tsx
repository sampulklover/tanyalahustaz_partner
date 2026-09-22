"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  createKnowledgeArticle,
  updateKnowledgeArticle,
} from "@/app/actions/knowledge-admin";
import { slugify } from "@/lib/knowledge-form";
import {
  MAX_TOTAL_UPLOAD_BYTES,
  isDocumentFilename,
  type KnowledgeImportRow,
} from "@/lib/knowledge-import";
import { requestDocumentArticles } from "@/lib/knowledge-upload";
import type { KnowledgeArticle } from "@/lib/types";
import { useI18n } from "@/lib/i18n/client";

const CATEGORIES = ["general", "fiqh", "ibadah", "aqidah", "akhlak"];

const inputClass =
  "w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30";

type FormState = { error?: string; success?: string };

type UploadState = {
  processing?: boolean;
  error?: string;
  notice?: string;
};

type KnowledgeArticleFormProps = {
  article?: KnowledgeArticle;
};

export function KnowledgeArticleForm({ article }: KnowledgeArticleFormProps) {
  const { t } = useI18n();
  const isEdit = Boolean(article);

  const [title, setTitle] = useState(article?.title ?? "");
  const [slug, setSlug] = useState(article?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [category, setCategory] = useState(article?.category ?? "general");
  const [summary, setSummary] = useState(article?.summary ?? "");
  const [content, setContent] = useState(article?.content ?? "");
  const [tags, setTags] = useState(article?.tags?.join(", ") ?? "");
  const [uploadState, setUploadState] = useState<UploadState>({});

  const [state, formAction, isPending] = useActionState(
    async (_prev: FormState, formData: FormData) => {
      if (isEdit && article) {
        return updateKnowledgeArticle(article.id, formData);
      }
      return createKnowledgeArticle(formData);
    },
    {},
  );

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugTouched) {
      setSlug(slugify(value));
    }
  }

  function applyGeneratedRow(row: KnowledgeImportRow) {
    setTitle(row.title);
    setSlug(row.slug);
    setSlugTouched(true);
    setCategory(row.category);
    setSummary(row.summary);
    setContent(row.content);
    setTags(row.tags.join(", "));
  }

  async function handleDocument(file: File) {
    if (!isDocumentFilename(file.name)) {
      setUploadState({ error: t("knowledge.articleForm.uploadUnsupported") });
      return;
    }

    if (file.size > MAX_TOTAL_UPLOAD_BYTES) {
      setUploadState({
        error: t("knowledge.articleForm.uploadTooLarge", {
          size: Math.round(MAX_TOTAL_UPLOAD_BYTES / 1024 / 1024),
        }),
      });
      return;
    }

    setUploadState({ processing: true });

    try {
      const results = await requestDocumentArticles([file], true);
      const result = results[0];

      if (!result?.row) {
        setUploadState({
          error: result?.error ?? t("knowledge.articleForm.uploadFailed"),
        });
        return;
      }

      applyGeneratedRow(result.row);
      setUploadState({
        notice: t("knowledge.articleForm.uploadApplied", { name: file.name }),
      });
    } catch (error) {
      setUploadState({
        error:
          error instanceof Error ? error.message : t("knowledge.articleForm.uploadFailed"),
      });
    }
  }

  return (
    <form action={formAction} className="space-y-8">
      <section className="rounded-xl border border-dashed border-border bg-background-subtle p-5">
        <h2 className="text-sm font-semibold">{t("knowledge.articleForm.uploadTitle")}</h2>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          {t("knowledge.articleForm.uploadDescription")}
        </p>

        <label
          htmlFor="article-document"
          className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-background px-6 py-8 text-center transition hover:border-brand-400 hover:bg-brand-50/40 dark:hover:bg-brand-900/10"
        >
          <span className="text-sm font-medium">{t("knowledge.articleForm.uploadCta")}</span>
          <span className="mt-1 text-xs text-[color:var(--muted)]">
            {t("knowledge.articleForm.uploadHint")}
          </span>
          <input
            id="article-document"
            type="file"
            accept=".pdf,.docx,.txt"
            disabled={uploadState.processing}
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleDocument(file);
              }
              event.target.value = "";
            }}
          />
        </label>

        {uploadState.processing && (
          <p className="mt-3 text-sm font-medium text-brand-700 dark:text-brand-300">
            {t("knowledge.articleForm.uploading")}
          </p>
        )}
        {uploadState.error && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {uploadState.error}
          </p>
        )}
        {uploadState.notice && (
          <p className="mt-3 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-800 dark:border-brand-900 dark:bg-brand-900/20 dark:text-brand-200">
            {uploadState.notice}
          </p>
        )}
      </section>

      <section className="space-y-6">
        <div>
          <h2 className="text-sm font-semibold">{t("knowledge.articleForm.detailsTitle")}</h2>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            {t("knowledge.articleForm.detailsDescription")}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="title" className="mb-1.5 block text-sm font-medium">
              {t("common.title")}
            </label>
            <input
              id="title"
              name="title"
              required
              value={title}
              onChange={(event) => handleTitleChange(event.target.value)}
              className={inputClass}
              placeholder={t("knowledge.articleForm.titlePlaceholder")}
            />
          </div>

          <div>
            <label htmlFor="slug" className="mb-1.5 block text-sm font-medium">
              {t("common.slug")}
            </label>
            <input
              id="slug"
              name="slug"
              required
              value={slug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(event.target.value);
              }}
              className={`${inputClass} font-mono`}
              placeholder={t("knowledge.articleForm.slugPlaceholder")}
            />
          </div>

          <div>
            <label htmlFor="category" className="mb-1.5 block text-sm font-medium">
              {t("common.category")}
            </label>
            <input
              id="category"
              name="category"
              list="knowledge-categories"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className={inputClass}
            />
            <datalist id="knowledge-categories">
              {CATEGORIES.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="summary" className="mb-1.5 block text-sm font-medium">
              {t("common.summary")}
            </label>
            <textarea
              id="summary"
              name="summary"
              required
              rows={2}
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              className={inputClass}
              placeholder={t("knowledge.articleForm.summaryPlaceholder")}
            />
          </div>
        </div>
      </section>

      <section className="space-y-6 border-t border-border pt-8">
        <div>
          <h2 className="text-sm font-semibold">{t("knowledge.articleForm.contentTitle")}</h2>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            {t("knowledge.articleForm.contentDescription")}
          </p>
        </div>

        <div>
          <label htmlFor="content" className="mb-1.5 block text-sm font-medium">
            {t("knowledge.articleForm.articleContent")}
          </label>
          <textarea
            id="content"
            name="content"
            required
            rows={14}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            className={`${inputClass} font-mono text-[13px] leading-relaxed`}
            placeholder={t("knowledge.articleForm.contentPlaceholder")}
          />
        </div>

        <div>
          <label htmlFor="tags" className="mb-1.5 block text-sm font-medium">
            {t("common.tags")}
          </label>
          <input
            id="tags"
            name="tags"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder={t("knowledge.articleForm.tagsPlaceholder")}
            className={inputClass}
          />
          <p className="mt-1.5 text-xs text-[color:var(--muted)]">{t("knowledge.articleForm.tagsHelp")}</p>
        </div>
      </section>

      <section className="border-t border-border pt-8">
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-background-subtle p-4">
          <input
            id="published"
            name="published"
            type="checkbox"
            defaultChecked={article?.published ?? true}
            className="mt-0.5 h-4 w-4 rounded border-border text-brand-600 focus:ring-brand-500"
          />
          <span>
            <span className="block text-sm font-medium">{t("knowledge.articleForm.publishedLabel")}</span>
            <span className="mt-0.5 block text-sm text-[color:var(--muted)]">
              {t("knowledge.articleForm.publishedDescription")}
            </span>
          </span>
        </label>
      </section>

      {state.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800 dark:border-brand-900 dark:bg-brand-900/20 dark:text-brand-200">
          {state.success}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-6">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {isPending
            ? t("knowledge.articleForm.saving")
            : isEdit
              ? t("knowledge.articleForm.saveChanges")
              : t("knowledge.articleForm.createArticle")}
        </button>
        <Link
          href="/dashboard/knowledge"
          className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium transition hover:bg-background-subtle"
        >
          {t("common.cancel")}
        </Link>
      </div>
    </form>
  );
}
