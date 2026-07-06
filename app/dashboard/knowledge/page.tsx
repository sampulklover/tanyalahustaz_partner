import Link from "next/link";
import { KnowledgeNav } from "@/components/knowledge-nav";
import { KnowledgeReembedButton } from "@/components/knowledge-reembed-button";
import { getDashboardContext } from "@/lib/dashboard";
import { createClient } from "@/lib/supabase/server";
import type { KnowledgeArticle } from "@/lib/types";

export const metadata = { title: "Knowledge Base" };

type PageProps = {
  searchParams: Promise<{ saved?: string; deleted?: string; embedded?: string }>;
};

export default async function KnowledgeAdminPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const context = await getDashboardContext();
  const knowledge = context!.knowledge;
  const supabase = await createClient();

  const [{ data: articles }, { data: chunks }] = await Promise.all([
    supabase
      .from("knowledge_articles")
      .select("*")
      .order("updated_at", { ascending: false }),
    supabase.from("knowledge_chunks").select("article_id"),
  ]);

  const chunkCounts = new Map<string, number>();
  for (const row of chunks ?? []) {
    const id = row.article_id as string;
    chunkCounts.set(id, (chunkCounts.get(id) ?? 0) + 1);
  }

  const items = (articles ?? []) as KnowledgeArticle[];

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <KnowledgeNav knowledge={knowledge} active="articles" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Knowledge base</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Manage Islamic content that powers partner AI chat. Published articles are embedded
            automatically for semantic search.
          </p>
        </div>
        {knowledge.canEditKnowledge && (
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <Link
              href="/dashboard/knowledge/new"
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              New article
            </Link>
            <KnowledgeReembedButton />
          </div>
        )}
      </div>

      {params.saved === "1" && (
        <p className="mt-6 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950/30">
          Article created
          {params.embedded ? ` and embedded (${params.embedded} chunk(s)).` : "."}
        </p>
      )}
      {params.deleted === "1" && (
        <p className="mt-6 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950/30">
          Article deleted.
        </p>
      )}

      <div className="mt-8 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {items.length === 0 ? (
          <p className="p-8 text-sm text-zinc-500">
            {knowledge.canEditKnowledge
              ? "No articles yet. Create your first one."
              : "No articles yet."}
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Chunks</th>
                <th className="px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {items.map((article) => (
                <tr key={article.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{article.title}</div>
                    <div className="font-mono text-xs text-zinc-500">{article.slug}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
                      {article.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {article.published ? (
                      <span className="text-emerald-600">Published</span>
                    ) : (
                      <span className="text-zinc-500">Draft</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {chunkCounts.get(article.id) ?? 0}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {new Date(article.updated_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/knowledge/${article.id}/edit`}
                      className="font-medium text-emerald-600 hover:underline"
                    >
                      {knowledge.canEditKnowledge ? "Edit" : "View"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
