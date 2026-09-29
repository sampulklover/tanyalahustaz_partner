"use client";

import { useActionState } from "react";
import {
  sendLowBalanceTest,
  updateLowBalanceAlert,
  type BillingAlertState,
} from "@/app/actions/billing-alerts";
import { formatMyr } from "@/lib/billing";
import { useI18n } from "@/lib/i18n/client";

type LowBalanceAlertsProps = {
  thresholdCents: number | null;
  emailConfigured: boolean;
};

const initialState: BillingAlertState = {};

export function LowBalanceAlerts({ thresholdCents, emailConfigured }: LowBalanceAlertsProps) {
  const { t } = useI18n();

  const [saveState, saveAction, saving] = useActionState<BillingAlertState, FormData>(
    async (prev, formData) => (await updateLowBalanceAlert(prev, formData)) ?? {},
    initialState,
  );
  const [testState, testAction, testing] = useActionState<BillingAlertState, FormData>(
    async () => (await sendLowBalanceTest()) ?? {},
    initialState,
  );

  function message(state: BillingAlertState): string | null {
    if (state.error) {
      return state.error === "notConfigured"
        ? t("billingAlerts.notConfigured")
        : state.error === "noEmail"
          ? t("billingAlerts.noEmail")
          : state.error === "invalidAmount"
            ? t("actionErrors.invalidAmount")
            : t("billingAlerts.sendFailed");
    }

    if (state.success === "testSent") return t("billingAlerts.testSent");
    if (state.success === "disabled") return t("billingAlerts.disabled");
    if (state.success === "saved") return t("billingAlerts.saved");

    return null;
  }

  const feedback = message(saveState) ?? message(testState);
  const isError = Boolean(saveState.error ?? testState.error);

  return (
    <section className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <h2 className="font-semibold">{t("billingAlerts.title")}</h2>
        <p className="mt-1 text-xs leading-relaxed text-[color:var(--muted)]">
          {t("billingAlerts.description")}
        </p>
      </div>

      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-end gap-3">
          <form action={saveAction} className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="text-sm font-medium">{t("billingAlerts.thresholdLabel")}</span>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm text-[color:var(--muted)]">RM</span>
                <input
                  type="number"
                  name="threshold"
                  min={0}
                  step="1"
                  inputMode="decimal"
                  defaultValue={thresholdCents ? thresholdCents / 100 : ""}
                  placeholder={t("billingAlerts.thresholdPlaceholder")}
                  className="w-40 rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
                />
              </div>
            </label>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98] disabled:opacity-60"
            >
              {saving ? t("billingAlerts.saving") : t("billingAlerts.save")}
            </button>
          </form>
          <form action={testAction}>
            <button
              type="submit"
              disabled={testing || !emailConfigured}
              className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium transition hover:bg-background-subtle active:scale-[0.98] disabled:opacity-60"
            >
              {testing ? t("billingAlerts.testSending") : t("billingAlerts.testButton")}
            </button>
          </form>
        </div>

        <p className="text-xs leading-relaxed text-[color:var(--muted)]">
          {thresholdCents
            ? t("billingAlerts.thresholdHint", { amount: formatMyr(thresholdCents, { decimals: true }) })
            : t("billingAlerts.thresholdOff")}
        </p>

        {!emailConfigured && (
          <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            {t("billingAlerts.notConfigured")}
          </p>
        )}

        {feedback && (
          <p
            className={`rounded-lg border px-3 py-2 text-sm ${
              isError
                ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
                : "border-brand-200 bg-brand-50 text-brand-800 dark:border-brand-900 dark:bg-brand-900/20 dark:text-brand-200"
            }`}
          >
            {feedback}
          </p>
        )}
      </div>
    </section>
  );
}
