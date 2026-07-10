import Link from "next/link";
import { KnowledgeBulkImport } from "@/components/knowledge-bulk-import";
import { KnowledgeNav } from "@/components/knowledge-nav";
import { DashboardPage as DashboardShell } from "@/components/dashboard/page";
import { PageHeader } from "@/components/dashboard/page-header";
import { getDashboardContext } from "@/lib/dashboard";
import { getTranslations } from "@/lib/i18n/server";

export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t("pages.knowledge.import.title") };
}

export default async function KnowledgeImportPage() {
  const t = await getTranslations();
  const context = await getDashboardContext();
  const knowledge = context!.knowledge;

  return (
    <DashboardShell>
      <KnowledgeNav knowledge={knowledge} active="articles" />

      <PageHeader
        title={t("pages.knowledge.import.title")}
        description={t("pages.knowledge.import.description")}
        actions={
          <Link
            href="/dashboard/knowledge/new"
            className="inline-flex items-center justify-center rounded-lg border border-border px-5 py-2.5 text-sm font-medium transition hover:bg-background-subtle"
          >
            {t("common.singleArticle")}
          </Link>
        }
      />

      <KnowledgeBulkImport />
    </DashboardShell>
  );
}
