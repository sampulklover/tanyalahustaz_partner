import Link from "next/link";
import { KnowledgeNav } from "@/components/knowledge-nav";
import { KnowledgeReembedButton } from "@/components/knowledge-reembed-button";
import { DashboardPage as DashboardShell } from "@/components/dashboard/page";
import { PageHeader } from "@/components/dashboard/page-header";
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
    <DashboardShell>
      <KnowledgeNav knowledge={knowledge} active="articles" />

      <PageHeader
        title="Knowledge base"
        description="Curated Islamic content that powers API responses. Published articles are embedded for semantic search."
        actions={
          knowledge.canEditKnowledge ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href="/dashboard/knowledge/new"
                className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
              >
                New article
              </Link>
              <KnowledgeReembedButton />
            </div>
          ) : undefined
        }
      />

      {params.saved === "1" && (
        <p className="mb-6 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800 dark:border-brand-900 dark:bg-brand-900/20 dark:text-brand-200">
          Article created
          {params.embedded ? ` and embedded (${params.embedded} chunk(s)).` : "."}
        </p>
      )}
      {params.deleted === "1" && (
        <p className="mb-6 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800 dark:border-brand-900 dark:bg-brand-900/20 dark:text-brand-200">
          Article deleted.
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {items.length === 0 ? (
          <p className="p-8 text-sm text-[color:var(--muted)]">
            {knowledge.canEditKnowledge
              ? "No articles yet. Create your first one."
              : "No articles yet."}
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-background-subtle text-xs uppercase tracking-wide text-[color:var(--muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Chunks</th>
                <th className="px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((article) => (
                <tr key={article.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{article.title}</div>
                    <div className="font-mono text-xs text-[color:var(--muted)]">{article.slug}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-background-subtle px-2 py-0.5 text-xs">
                      {article.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {article.published ? (
                      <span className="font-medium text-brand-600 dark:text-brand-500">Published</span>
                    ) : (
                      <span className="text-[color:var(--muted)]">Draft</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[color:var(--muted)]">
                    {chunkCounts.get(article.id) ?? 0}
                  </td>
                  <td className="px-4 py-3 text-[color:var(--muted)]">
                    {new Date(article.updated_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/knowledge/${article.id}/edit`}
                      className="font-medium text-brand-600 hover:underline dark:text-brand-500"
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
    </DashboardShell>
  );
}
