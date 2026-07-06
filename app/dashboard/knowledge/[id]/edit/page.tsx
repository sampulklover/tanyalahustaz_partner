import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteKnowledgeButton } from "@/components/delete-knowledge-button";
import { KnowledgeArticleForm } from "@/components/knowledge-article-form";
import { KnowledgeArticleViewer } from "@/components/knowledge-article-viewer";
import { KnowledgeNav } from "@/components/knowledge-nav";
import { getDashboardContext } from "@/lib/dashboard";
import { createClient } from "@/lib/supabase/server";
import type { KnowledgeArticle } from "@/lib/types";

export const metadata = { title: "Knowledge Article" };

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditKnowledgeArticlePage({ params }: PageProps) {
  const { id } = await params;
  const context = await getDashboardContext();
  const canEdit = context!.knowledge.canEditKnowledge;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("knowledge_articles")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  const article = data as KnowledgeArticle;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <KnowledgeNav knowledge={context!.knowledge} active="articles" />

      <Link
        href="/dashboard/knowledge"
        className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        ← Back to articles
      </Link>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {canEdit ? "Edit article" : "View article"}
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">{article.title}</p>
        </div>
        {canEdit && <DeleteKnowledgeButton articleId={article.id} />}
      </div>
      <div className="mt-8">
        {canEdit ? <KnowledgeArticleForm article={article} /> : <KnowledgeArticleViewer article={article} />}
      </div>
    </main>
  );
}
