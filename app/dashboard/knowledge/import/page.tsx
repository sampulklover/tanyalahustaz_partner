import Link from "next/link";
import { KnowledgeBulkImport } from "@/components/knowledge-bulk-import";
import { KnowledgeNav } from "@/components/knowledge-nav";
import { DashboardPage as DashboardShell } from "@/components/dashboard/page";
import { PageHeader } from "@/components/dashboard/page-header";
import { getDashboardContext } from "@/lib/dashboard";

export const metadata = { title: "Bulk Import — Knowledge Base" };

export default async function KnowledgeImportPage() {
  const context = await getDashboardContext();
  const knowledge = context!.knowledge;

  return (
    <DashboardShell>
      <KnowledgeNav knowledge={knowledge} active="articles" />

      <PageHeader
        title="Bulk import"
        description="Upload JSON, CSV, or Markdown files to add many knowledge articles at once. Articles are validated before import."
        actions={
          <Link
            href="/dashboard/knowledge/new"
            className="inline-flex items-center justify-center rounded-lg border border-border px-5 py-2.5 text-sm font-medium transition hover:bg-background-subtle"
          >
            Single article
          </Link>
        }
      />

      <KnowledgeBulkImport />
    </DashboardShell>
  );
}
