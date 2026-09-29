import Link from "next/link";
import { resetPartnerPrompt, updatePartnerPrompt } from "@/app/actions/partner-prompt";
import { ActionButton } from "@/components/action-button";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { DashboardPage as DashboardShell } from "@/components/dashboard/page";
import { PageHeader } from "@/components/dashboard/page-header";
import { getPartnerPrompt } from "@/lib/ai-settings";
import { getDashboardContext } from "@/lib/dashboard";
import { getTranslations } from "@/lib/i18n/server";

export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t("partnerPrompt.title") };
}

export default async function PartnerPromptPage() {
  const t = await getTranslations();
  const context = await getDashboardContext();
  const partnerPrompt = await getPartnerPrompt(context!.userId);
  const hasCustom = partnerPrompt.trim().length > 0;

  return (
    <DashboardShell>
      <PageHeader
        title={t("partnerPrompt.title")}
        description={t("partnerPrompt.description")}
        actions={
          <Link
            href="/dashboard/demo"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold transition hover:bg-background-subtle"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M3 9h18" />
            </svg>
            {t("partnerPrompt.tryDemo")}
            <svg className="h-3.5 w-3.5 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <path d="M15 3h6v6" />
              <path d="M10 14 21 3" />
            </svg>
          </Link>
        }
      />

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="font-semibold">{t("partnerPrompt.editorTitle")}</h2>
            <p className="mt-1 text-xs leading-relaxed text-[color:var(--muted)]">
              {t("partnerPrompt.editorHint")}
            </p>
          </div>
          {hasCustom && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              {t("partnerPrompt.activeBadge")}
            </span>
          )}
        </div>

        <ActionForm
          action={updatePartnerPrompt}
          className="space-y-4 p-5"
          successMessage={t("partnerPrompt.saved")}
        >
          <textarea
            name="promptInstructions"
            defaultValue={partnerPrompt}
            rows={8}
            spellCheck={false}
            placeholder={t("partnerPrompt.placeholder")}
            className="w-full rounded-lg border border-border bg-background-subtle p-4 text-sm leading-relaxed outline-none transition focus:border-brand-500 focus:bg-card"
          />
          <div className="flex flex-wrap items-center gap-3">
            <SubmitButton
              pendingLabel={t("common.saving")}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t("partnerPrompt.save")}
            </SubmitButton>
            {hasCustom && (
              <ActionButton
                action={resetPartnerPrompt}
                pendingLabel={t("common.saving")}
                successMessage={t("partnerPrompt.resetDone")}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium transition hover:bg-background-subtle active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t("partnerPrompt.reset")}
              </ActionButton>
            )}
          </div>
        </ActionForm>
      </section>
    </DashboardShell>
  );
}
