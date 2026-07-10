"use client";

import type { KnowledgeArticle } from "@/lib/types";
import { useI18n } from "@/lib/i18n/client";

export function KnowledgeArticleViewer({ article }: { article: KnowledgeArticle }) {
  const { t } = useI18n();

  return (
    <div className="space-y-8">
      <dl className="grid gap-4 rounded-xl border border-border bg-background-subtle p-5 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">{t("knowledge.viewer.slug")}</dt>
          <dd className="mt-1 font-mono text-sm">{article.slug}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">{t("knowledge.viewer.category")}</dt>
          <dd className="mt-1">
            <span className="rounded-full bg-card px-2 py-0.5 text-sm">{article.category}</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">{t("knowledge.viewer.status")}</dt>
          <dd className="mt-1 text-sm">
            {article.published ? (
              <span className="font-medium text-brand-600 dark:text-brand-500">{t("common.published")}</span>
            ) : (
              <span className="text-[color:var(--muted)]">{t("common.draft")}</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">{t("knowledge.viewer.updated")}</dt>
          <dd className="mt-1 text-sm text-[color:var(--muted)]">
            {new Date(article.updated_at).toLocaleString()}
          </dd>
        </div>
      </dl>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">{t("knowledge.viewer.summary")}</h2>
        <p className="mt-2 text-sm leading-relaxed">{article.summary}</p>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">{t("knowledge.viewer.content")}</h2>
        <div className="mt-2 whitespace-pre-wrap rounded-xl border border-border bg-background-subtle p-5 text-sm leading-relaxed">
          {article.content}
        </div>
      </section>

      {article.tags?.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">{t("knowledge.viewer.tags")}</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-background-subtle px-2.5 py-0.5 text-xs font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
