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
    <form action={formAction} className="space-y-6">
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
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
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
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-950"
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
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
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
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="content" className="mb-1.5 block text-sm font-medium">
            Content
          </label>
          <textarea
            id="content"
            name="content"
            required
            rows={12}
            defaultValue={article?.content}
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
          <p className="mt-1 text-xs text-zinc-500">
            This text powers the AI knowledge context. Saving a published article auto-re-embeds it.
          </p>
        </div>

        <div className="md:col-span-2">
          <label htmlFor="tags" className="mb-1.5 block text-sm font-medium">
            Tags (comma-separated)
          </label>
          <input
            id="tags"
            name="tags"
            defaultValue={article?.tags?.join(", ") ?? ""}
            placeholder="solat, fiqh, travel"
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
        </div>

        <div className="flex items-center gap-2 md:col-span-2">
          <input
            id="published"
            name="published"
            type="checkbox"
            defaultChecked={article?.published ?? true}
            className="h-4 w-4 rounded border-zinc-300"
          />
          <label htmlFor="published" className="text-sm">
            Published (visible to AI and partners via API)
          </label>
        </div>
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/30">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/30">
          {state.success}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {isPending ? "Saving…" : isEdit ? "Save changes" : "Create article"}
        </button>
        <Link
          href="/dashboard/knowledge"
          className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm dark:border-zinc-700"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
