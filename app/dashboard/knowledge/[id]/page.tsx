import Link from "next/link";
import { notFound } from "next/navigation";
import { KnowledgeArticleViewer } from "@/components/knowledge-article-viewer";
import { KnowledgeNav } from "@/components/knowledge-nav";
import { DashboardPage as DashboardShell } from "@/components/dashboard/page";
import { PageHeader } from "@/components/dashboard/page-header";
import { getDashboardContext } from "@/lib/dashboard";
import { formatBytes } from "@/lib/format-bytes";
import { createClient } from "@/lib/supabase/server";
import type { KnowledgeArticle } from "@/lib/types";
import { getTranslations } from "@/lib/i18n/server";

export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t("pages.knowledge.edit.viewTitle") };
}

type PageProps = {
  params: Promise<{ id: string }>;
};

/**
 * Read-only view of one knowledge article. Content is owned by Google Cloud;
 * edits happen in the source system, then a sync updates the mirror.
 */
export default async function KnowledgeArticlePage({ params }: PageProps) {
  const t = await getTranslations();
  const { id } = await params;
  const context = await getDashboardContext();
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
  const isMirrored = Boolean(article.source_provider);

  return (
    <DashboardShell>
      <KnowledgeNav knowledge={context!.knowledge} active="sources" />

      <Link
        href="/dashboard/knowledge/sources"
        className="mb-4 inline-flex items-center gap-1 text-sm text-[color:var(--muted)] transition hover:text-foreground"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M15 18l-6-6 6-6" />
        </svg>
        {t("knowledge.library.backToLibrary")}
      </Link>

      <PageHeader
        title={t("pages.knowledge.edit.viewTitle")}
        description={article.title}
      />

      {isMirrored && (
        <p className="mb-4 rounded-lg border border-border bg-background-subtle px-4 py-3 text-sm text-[color:var(--muted)]">
          {t("knowledge.sources.readOnlyNote")}
          {article.source_path && (
            <span className="mt-1 block break-all font-mono text-xs">
              {article.source_path}
              {article.source_size != null && (
                <span className="ml-2 inline-block rounded-full bg-card px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                  {formatBytes(article.source_size)}
                </span>
              )}
            </span>
          )}
        </p>
      )}

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <KnowledgeArticleViewer article={article} />
      </div>
    </DashboardShell>
  );
}
