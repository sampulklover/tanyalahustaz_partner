import {
  deletePartnerKnowledge,
  uploadPartnerKnowledgeFiles,
} from "@/app/actions/partner-knowledge";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { DashboardPage as DashboardShell } from "@/components/dashboard/page";
import { PageHeader } from "@/components/dashboard/page-header";
import { getDashboardContext } from "@/lib/dashboard";
import { listPartnerKnowledgeFiles } from "@/lib/partner-knowledge";
import { getTranslations } from "@/lib/i18n/server";

export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t("partnerKnowledge.title") };
}

export default async function PartnerKnowledgeBasePage() {
  const t = await getTranslations();
  const context = await getDashboardContext();
  const files = await listPartnerKnowledgeFiles(context!.userId);

  const readyCount = files.filter((file) => file.status === "ready").length;
  const totalChunks = files.reduce((sum, file) => sum + (file.chunk_count ?? 0), 0);

  return (
    <DashboardShell>
      <PageHeader
        title={t("partnerKnowledge.title")}
        description={t("partnerKnowledge.description")}
      />

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="font-semibold">{t("partnerKnowledge.uploadTitle")}</h2>
            <p className="mt-1 text-xs leading-relaxed text-[color:var(--muted)]">
              {t("partnerKnowledge.uploadHint")}
            </p>
          </div>
          {files.length > 0 && (
            <span className="rounded-full bg-background-subtle px-2.5 py-1 text-xs font-medium text-[color:var(--muted)]">
              {t("partnerKnowledge.summary", {
                files: readyCount,
                chunks: totalChunks,
              })}
            </span>
          )}
        </div>

        <ActionForm
          action={uploadPartnerKnowledgeFiles}
          className="space-y-4 p-5"
          successMessage={t("partnerKnowledge.uploadedGeneric")}
        >
          <input
            type="file"
            name="files"
            multiple
            accept=".pdf,.docx,.txt,.md,.markdown"
            className="block w-full cursor-pointer rounded-lg border border-dashed border-border bg-background-subtle p-4 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-700"
          />
          <p className="text-xs leading-relaxed text-[color:var(--muted)]">
            {t("partnerKnowledge.billingNote")}
          </p>
          <SubmitButton
            pendingLabel={t("partnerKnowledge.uploading")}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t("partnerKnowledge.upload")}
          </SubmitButton>
        </ActionForm>
      </section>

      <section className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold">{t("partnerKnowledge.filesTitle")}</h2>
        </div>

        {files.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-[color:var(--muted)]">
            {t("partnerKnowledge.empty")}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {files.map((file) => (
              <li
                key={file.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{file.filename}</p>
                  <p className="mt-1 text-xs text-[color:var(--muted)]">
                    {t("partnerKnowledge.fileMeta", {
                      chunks: file.chunk_count,
                      date: new Date(file.created_at).toLocaleString(),
                    })}
                  </p>
                  {file.status === "failed" && file.error && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                      {file.error}
                    </p>
                  )}
                  {file.preview && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-medium text-[color:var(--muted)] hover:text-foreground">
                        {t("partnerKnowledge.previewLabel")}
                      </summary>
                      <p className="mt-1.5 max-w-prose whitespace-pre-wrap text-xs leading-relaxed text-[color:var(--muted)]">
                        {file.preview}
                      </p>
                    </details>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={
                      file.status === "ready"
                        ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                        : file.status === "failed"
                          ? "rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-200"
                          : "rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
                    }
                  >
                    {t(`partnerKnowledge.status.${file.status}`)}
                  </span>

                  <ActionForm action={deletePartnerKnowledge}>
                    <input type="hidden" name="fileId" value={file.id} />
                    <SubmitButton
                      pendingLabel={t("common.saving")}
                      className="inline-flex items-center justify-center rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-background-subtle disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {t("partnerKnowledge.delete")}
                    </SubmitButton>
                  </ActionForm>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </DashboardShell>
  );
}
