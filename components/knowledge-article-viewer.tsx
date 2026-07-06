import type { KnowledgeArticle } from "@/lib/types";

export function KnowledgeArticleViewer({ article }: { article: KnowledgeArticle }) {
  return (
    <div className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Slug</p>
          <p className="mt-1 font-mono text-sm">{article.slug}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Category</p>
          <p className="mt-1 text-sm">{article.category}</p>
        </div>
        <div className="sm:col-span-2">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Status</p>
          <p className="mt-1 text-sm">{article.published ? "Published" : "Draft"}</p>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Summary</p>
        <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{article.summary}</p>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Content</p>
        <div className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
          {article.content}
        </div>
      </div>

      {article.tags?.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Tags</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
