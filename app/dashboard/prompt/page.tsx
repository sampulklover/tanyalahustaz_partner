import { resetPartnerPrompt, updatePartnerPrompt } from "@/app/actions/partner-prompt";
import { DashboardPage as DashboardShell } from "@/components/dashboard/page";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  composeSystemPrompt,
  DEFAULT_SYSTEM_PROMPT,
  KNOWLEDGE_PLACEHOLDER,
} from "@/lib/ai-prompt";
import { getPartnerPrompt, getSystemPromptSettings } from "@/lib/ai-settings";
import { getDashboardContext } from "@/lib/dashboard";
import { getTranslations } from "@/lib/i18n/server";

export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t("partnerPrompt.title") };
}

const SAMPLE_CONTEXT =
  "[Source 1: Combining prayers while traveling (fiqh)]\nTravelers may combine Dhuhr with Asr, and Maghrib with Isha…";

export default async function PartnerPromptPage() {
  const t = await getTranslations();
  const context = await getDashboardContext();
  const userId = context!.userId;

  const [settings, partnerPrompt] = await Promise.all([
    getSystemPromptSettings(),
    getPartnerPrompt(userId),
  ]);

  const hasCustom = partnerPrompt.trim().length > 0;
  const globalBase = settings.customPrompt.trim() || DEFAULT_SYSTEM_PROMPT;
  const effective = hasCustom
    ? `${globalBase}\n\nPARTNER-SPECIFIC INSTRUCTIONS (set by the API owner):\n${partnerPrompt}`
    : globalBase;
  const preview = composeSystemPrompt(effective, SAMPLE_CONTEXT);

  return (
    <DashboardShell>
      <PageHeader title={t("partnerPrompt.title")} description={t("partnerPrompt.description")} />

      <div className="mb-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border shadow-sm sm:grid-cols-3">
        <div className="bg-card px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted)]">
            {t("partnerPrompt.statusLabel")}
          </p>
          <p className="mt-2 flex items-center gap-2 text-sm font-semibold">
            <span
              className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
                hasCustom ? "bg-brand-500" : "bg-emerald-500"
              }`}
            />
            {hasCustom ? t("partnerPrompt.statusCustom") : t("partnerPrompt.statusDefault")}
          </p>
        </div>
        <div className="bg-card px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted)]">
            {t("partnerPrompt.updatedLabel")}
          </p>
          <p className="mt-2 text-sm">
            {settings.updatedAt ? new Date(settings.updatedAt).toLocaleString() : "—"}
          </p>
        </div>
        <div className="col-span-2 bg-card px-5 py-4 sm:col-span-1">
          <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted)]">
            {t("partnerPrompt.placeholderLabel")}
          </p>
          <p className="mt-2 font-mono text-sm">{KNOWLEDGE_PLACEHOLDER}</p>
        </div>
      </div>

      <section className="mb-8 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="font-semibold">{t("partnerPrompt.editorTitle")}</h2>
            <p className="mt-1 text-xs leading-relaxed text-[color:var(--muted)]">
              {t("partnerPrompt.editorHint")}
            </p>
          </div>
          {hasCustom && (
            <form action={resetPartnerPrompt}>
              <button
                type="submit"
                className="rounded-lg border border-border px-3.5 py-2 text-xs font-medium transition hover:bg-background-subtle active:scale-[0.98]"
              >
                {t("partnerPrompt.reset")}
              </button>
            </form>
          )}
        </div>

        <form action={updatePartnerPrompt} className="space-y-4 p-5">
          <textarea
            name="promptInstructions"
            defaultValue={partnerPrompt}
            rows={10}
            spellCheck={false}
            placeholder={t("partnerPrompt.placeholder")}
            className="w-full rounded-lg border border-border bg-background-subtle p-4 font-mono text-xs leading-relaxed outline-none transition focus:border-brand-500 focus:bg-card"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              {t("partnerPrompt.save")}
            </button>
            <span className="text-xs text-[color:var(--muted)]">{t("partnerPrompt.emptyHint")}</span>
          </div>
        </form>
      </section>

      <section className="mb-8 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold">{t("partnerPrompt.composedTitle")}</h2>
          <p className="mt-1 text-xs leading-relaxed text-[color:var(--muted)]">
            {t("partnerPrompt.composedHint")}
          </p>
        </div>
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap p-5 font-mono text-xs leading-relaxed text-[color:var(--muted)]">
          {preview}
        </pre>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold">{t("partnerPrompt.globalTitle")}</h2>
          <p className="mt-1 text-xs leading-relaxed text-[color:var(--muted)]">
            {t("partnerPrompt.globalHint")}
          </p>
        </div>
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap p-5 font-mono text-xs leading-relaxed">
          {globalBase}
        </pre>
      </section>
    </DashboardShell>
  );
}
