"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  createKnowledgeArticle,
  updateKnowledgeArticle,
} from "@/app/actions/knowledge-admin";
import { slugify } from "@/lib/knowledge-form";
import type { KnowledgeArticle } from "@/lib/types";

const CATEGORIES = ["general", "fiqh", "ibadah", "aqidah", "akhlak"];

const inputClass =
  "w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30";

type FormState = { error?: string; success?: string };

type KnowledgeArticleFormProps = {
  article?: KnowledgeArticle;
};

export function KnowledgeArticleForm({ article }: KnowledgeArticleFormProps) {
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
          <h2 className="text-sm font-semibold">Article details</h2>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Title, slug, and category appear in the knowledge API and search results.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="title" className="mb-1.5 block text-sm font-medium">
              Title
            </label>
            <input
              id="title"
              name="title"
              required
              defaultValue={article?.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className={inputClass}
              placeholder="e.g. Combining prayers while traveling"
            />
          </div>

          <div>
            <label htmlFor="slug" className="mb-1.5 block text-sm font-medium">
              Slug
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
              placeholder="combining-prayers-travel"
            />
          </div>

          <div>
            <label htmlFor="category" className="mb-1.5 block text-sm font-medium">
              Category
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
              Summary
            </label>
            <textarea
              id="summary"
              name="summary"
              required
              rows={2}
              defaultValue={article?.summary}
              className={inputClass}
              placeholder="Short description used in API responses and previews"
            />
          </div>
        </div>
      </section>

      <section className="space-y-6 border-t border-border pt-8">
        <div>
          <h2 className="text-sm font-semibold">Content</h2>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            The main body powers AI answers. Published articles are automatically re-embedded for search.
          </p>
        </div>

        <div>
          <label htmlFor="content" className="mb-1.5 block text-sm font-medium">
            Article content
          </label>
          <textarea
            id="content"
            name="content"
            required
            rows={14}
            defaultValue={article?.content}
            className={`${inputClass} font-mono text-[13px] leading-relaxed`}
            placeholder="Write the full article content here…"
          />
        </div>

        <div>
          <label htmlFor="tags" className="mb-1.5 block text-sm font-medium">
            Tags
          </label>
          <input
            id="tags"
            name="tags"
            defaultValue={article?.tags?.join(", ") ?? ""}
            placeholder="solat, fiqh, travel"
            className={inputClass}
          />
          <p className="mt-1.5 text-xs text-[color:var(--muted)]">Comma-separated</p>
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
            <span className="block text-sm font-medium">Published</span>
            <span className="mt-0.5 block text-sm text-[color:var(--muted)]">
              Visible to the AI and available via the knowledge API
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
          {isPending ? "Saving…" : isEdit ? "Save changes" : "Create article"}
        </button>
        <Link
          href="/dashboard/knowledge"
          className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium transition hover:bg-background-subtle"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
