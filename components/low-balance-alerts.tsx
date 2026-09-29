"use client";

import { useActionState } from "react";
import {
  sendLowBalanceTest,
  updateLowBalanceAlert,
  type BillingAlertState,
} from "@/app/actions/billing-alerts";
import { ActionToast } from "@/components/action-toast";
import { SubmitButton } from "@/components/submit-button";
import { formatMyr } from "@/lib/billing";
import { useI18n } from "@/lib/i18n/client";

type LowBalanceAlertsProps = {
  thresholdCents: number | null;
  emailConfigured: boolean;
};

const initialState: BillingAlertState = {};

export function LowBalanceAlerts({ thresholdCents, emailConfigured }: LowBalanceAlertsProps) {
  const { t } = useI18n();

  const [saveState, saveAction] = useActionState<BillingAlertState, FormData>(
    async (prev, formData) => (await updateLowBalanceAlert(prev, formData)) ?? {},
    initialState,
  );
  const [testState, testAction] = useActionState<BillingAlertState, FormData>(
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

  return (
    <section className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <ActionToast
        state={saveState}
        successMessage={message(saveState) ?? undefined}
        errorMessage={message(saveState) ?? undefined}
      />
      <ActionToast
        state={testState}
        successMessage={message(testState) ?? undefined}
        errorMessage={message(testState) ?? undefined}
      />
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
            <SubmitButton
              pendingLabel={t("billingAlerts.saving")}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t("billingAlerts.save")}
            </SubmitButton>
          </form>
          <form action={testAction}>
            <SubmitButton
              disabled={!emailConfigured}
              pendingLabel={t("billingAlerts.testSending")}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium transition hover:bg-background-subtle active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t("billingAlerts.testButton")}
            </SubmitButton>
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
      </div>
    </section>
  );
}
