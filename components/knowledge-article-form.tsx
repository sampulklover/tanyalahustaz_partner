"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  createKnowledgeArticle,
  updateKnowledgeArticle,
} from "@/app/actions/knowledge-admin";
import { slugify } from "@/lib/knowledge-form";
import type { KnowledgeArticle } from "@/lib/types";
import { useI18n } from "@/lib/i18n/client";

const CATEGORIES = ["general", "fiqh", "ibadah", "aqidah", "akhlak"];

const inputClass =
  "w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30";

type FormState = { error?: string; success?: string };

type KnowledgeArticleFormProps = {
  article?: KnowledgeArticle;
};

export function KnowledgeArticleForm({ article }: KnowledgeArticleFormProps) {
  const { t } = useI18n();
  const isEdit = Boolean(article);
  const [slug, setSlug] = useState(article?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEdit);

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
    if (!slugTouched) {
      setSlug(slugify(value));
    }
  }

  return (
    <form action={formAction} className="space-y-8">
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
              defaultValue={article?.title}
              onChange={(e) => handleTitleChange(e.target.value)}
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
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
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
              defaultValue={article?.category ?? "general"}
              className={inputClass}
            />
            <datalist id="knowledge-categories">
              {CATEGORIES.map((category) => (
                <option key={category} value={category} />
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
              defaultValue={article?.summary}
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
            defaultValue={article?.content}
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
            defaultValue={article?.tags?.join(", ") ?? ""}
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
