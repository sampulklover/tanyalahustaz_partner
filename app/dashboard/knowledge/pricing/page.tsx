import { updateBillingMarkup } from "@/app/actions/billing-settings";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { KnowledgeNav } from "@/components/knowledge-nav";
import { DashboardPage as DashboardShell } from "@/components/dashboard/page";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  computeChargeCents,
  formatMyr,
  getUsdMyrRate,
  MAX_MARKUP_PERCENT,
  MIN_MARKUP_PERCENT,
} from "@/lib/billing";
import { getBillingSettings } from "@/lib/billing-settings";
import { getDashboardContext } from "@/lib/dashboard";
import { getTranslations } from "@/lib/i18n/server";

export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t("pages.knowledge.pricing.title") };
}

const SAMPLE_COST_USD = 0.01;

export default async function KnowledgePricingPage() {
  const t = await getTranslations();
  const context = await getDashboardContext();
  const knowledge = context!.knowledge;
  const settings = await getBillingSettings();
  const usdMyrRate = getUsdMyrRate();

  const baseCents = Math.round(SAMPLE_COST_USD * usdMyrRate * 100);
  const chargedCents = computeChargeCents(SAMPLE_COST_USD, settings.markupPercent, usdMyrRate);
  const marginCents = chargedCents - baseCents;

  return (
    <DashboardShell>
      <KnowledgeNav knowledge={knowledge} active="pricing" />

      <PageHeader
        title={t("pages.knowledge.pricing.title")}
        description={t("pages.knowledge.pricing.description")}
      />

      <div className="mb-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border shadow-sm sm:grid-cols-3">
        <div className="bg-card px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted)]">
            {t("knowledge.pricing.currentLabel")}
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{settings.markupPercent}%</p>
        </div>
        <div className="bg-card px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted)]">
            {t("knowledge.pricing.minLabel")}
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{MIN_MARKUP_PERCENT}%</p>
        </div>
        <div className="col-span-2 bg-card px-5 py-4 sm:col-span-1">
          <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted)]">
            {t("knowledge.pricing.rateLabel")}
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight">
            1 USD = {usdMyrRate.toFixed(2)} MYR
          </p>
        </div>
      </div>

      <section className="mb-8 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold">{t("knowledge.pricing.editorTitle")}</h2>
          <p className="mt-1 text-xs leading-relaxed text-[color:var(--muted)]">
            {t("knowledge.pricing.editorHint", { min: String(MIN_MARKUP_PERCENT) })}
          </p>
        </div>

        <ActionForm
          action={updateBillingMarkup}
          className="space-y-4 p-5"
          successMessage={t("knowledge.pricing.saved")}
        >
          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="text-sm font-medium">{t("knowledge.pricing.inputLabel")}</span>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  name="markupPercent"
                  defaultValue={settings.markupPercent}
                  min={MIN_MARKUP_PERCENT}
                  max={MAX_MARKUP_PERCENT}
                  step="0.5"
                  required
                  className="w-40 rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
                />
                <span className="text-sm font-semibold">%</span>
              </div>
            </label>
            <SubmitButton
              pendingLabel={t("common.saving")}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t("knowledge.pricing.save")}
            </SubmitButton>
          </div>
          {settings.updatedAt && (
            <p className="text-xs text-[color:var(--muted)]">
              {t("knowledge.pricing.updatedLabel")}: {new Date(settings.updatedAt).toLocaleString()}
            </p>
          )}
        </ActionForm>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold">{t("knowledge.pricing.exampleTitle")}</h2>
          <p className="mt-1 text-xs leading-relaxed text-[color:var(--muted)]">
            {t("knowledge.pricing.exampleHint")}
          </p>
        </div>
        <dl className="divide-y divide-border">
          <div className="flex items-center justify-between px-5 py-3.5 text-sm">
            <dt className="text-[color:var(--muted)]">{t("knowledge.pricing.exampleCost")}</dt>
            <dd className="font-medium">{formatMyr(baseCents, { decimals: true })}</dd>
          </div>
          <div className="flex items-center justify-between px-5 py-3.5 text-sm">
            <dt className="text-[color:var(--muted)]">{t("knowledge.pricing.exampleCharge")}</dt>
            <dd className="font-semibold">
              {formatMyr(chargedCents, { decimals: true })}
            </dd>
          </div>
          <div className="flex items-center justify-between px-5 py-3.5 text-sm">
            <dt className="text-[color:var(--muted)]">{t("knowledge.pricing.exampleMargin")}</dt>
            <dd className="font-semibold text-brand-600 dark:text-brand-500">
              {formatMyr(marginCents, { decimals: true })}
            </dd>
          </div>
        </dl>
      </section>
    </DashboardShell>
  );
}
