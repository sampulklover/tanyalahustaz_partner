import Link from "next/link";
import { KnowledgeArticleForm } from "@/components/knowledge-article-form";
import { KnowledgeNav } from "@/components/knowledge-nav";
import { DashboardPage as DashboardShell } from "@/components/dashboard/page";
import { PageHeader } from "@/components/dashboard/page-header";
import { getDashboardContext } from "@/lib/dashboard";
import { getTranslations } from "@/lib/i18n/server";

export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t("pages.knowledge.new.title") };
}

export default async function NewKnowledgeArticlePage() {
  const t = await getTranslations();
  const context = await getDashboardContext();

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
        {t("common.backToArticles")}
      </Link>

      <PageHeader
        title={t("pages.knowledge.new.title")}
        description={t("pages.knowledge.new.description")}
      />

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <KnowledgeArticleForm />
      </div>
    </DashboardShell>
  );
}
