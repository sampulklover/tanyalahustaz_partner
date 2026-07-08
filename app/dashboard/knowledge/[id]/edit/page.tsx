import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteKnowledgeButton } from "@/components/delete-knowledge-button";
import { KnowledgeArticleForm } from "@/components/knowledge-article-form";
import { KnowledgeArticleViewer } from "@/components/knowledge-article-viewer";
import { KnowledgeNav } from "@/components/knowledge-nav";
import { DashboardPage as DashboardShell } from "@/components/dashboard/page";
import { PageHeader } from "@/components/dashboard/page-header";
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
    <DashboardShell>
      <KnowledgeNav knowledge={context!.knowledge} active="articles" />

      <Link
        href="/dashboard/knowledge"
        className="mb-4 inline-flex items-center gap-1 text-sm text-[color:var(--muted)] transition hover:text-foreground"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Back to articles
      </Link>

      <PageHeader
        title={canEdit ? "Edit article" : "View article"}
        description={article.title}
        actions={canEdit ? <DeleteKnowledgeButton articleId={article.id} /> : undefined}
      />

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        {canEdit ? (
          <KnowledgeArticleForm article={article} />
        ) : (
          <KnowledgeArticleViewer article={article} />
        )}
      </div>
    </DashboardShell>
  );
}
