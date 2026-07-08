import type { KnowledgeArticle } from "@/lib/types";

export function KnowledgeArticleViewer({ article }: { article: KnowledgeArticle }) {
  return (
    <div className="space-y-8">
      <dl className="grid gap-4 rounded-xl border border-border bg-background-subtle p-5 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">Slug</dt>
          <dd className="mt-1 font-mono text-sm">{article.slug}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">Category</dt>
          <dd className="mt-1">
            <span className="rounded-full bg-card px-2 py-0.5 text-sm">{article.category}</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">Status</dt>
          <dd className="mt-1 text-sm">
            {article.published ? (
              <span className="font-medium text-brand-600 dark:text-brand-500">Published</span>
            ) : (
              <span className="text-[color:var(--muted)]">Draft</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">Updated</dt>
          <dd className="mt-1 text-sm text-[color:var(--muted)]">
            {new Date(article.updated_at).toLocaleString()}
          </dd>
        </div>
      </dl>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">Summary</h2>
        <p className="mt-2 text-sm leading-relaxed">{article.summary}</p>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">Content</h2>
        <div className="mt-2 whitespace-pre-wrap rounded-xl border border-border bg-background-subtle p-5 text-sm leading-relaxed">
          {article.content}
        </div>
      </section>

      {article.tags?.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">Tags</h2>
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
