"use client";

import { useActionState, useState } from "react";
import { createTopUpCheckout } from "@/app/actions/billing";
import {
  formatMyr,
  MAX_TOPUP_CENTS,
  MIN_TOPUP_CENTS,
  TOPUP_PRESETS_MYR,
} from "@/lib/billing";
import { useI18n } from "@/lib/i18n/client";

type TopUpState = { error?: string };

const presets: number[] = [...TOPUP_PRESETS_MYR];

export function TopUpForm({ configured }: { configured: boolean }) {
  const { t } = useI18n();
  const [amountCents, setAmountCents] = useState<number>(presets[2] ?? 5000);
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");

  const [state, formAction, isPending] = useActionState<TopUpState, FormData>(
    async (_prev, formData) => (await createTopUpCheckout(formData)) ?? {},
    {},
  );

  function selectPreset(value: number) {
    setCustomOpen(false);
    setAmountCents(value);
  }

  function applyCustom(value: string) {
    setCustomValue(value);
    const ringgit = Number(value);
    if (Number.isFinite(ringgit) && ringgit > 0) {
      setAmountCents(Math.round(ringgit * 100));
    }
  }

  const validAmount = amountCents >= MIN_TOPUP_CENTS && amountCents <= MAX_TOPUP_CENTS;

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="amount_cents" value={amountCents} />

      <div>
        <p className="text-sm font-medium">{t("pages.topUp.amount")}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {presets.map((value) => {
            const selected = !customOpen && amountCents === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => selectPreset(value)}
                className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                  selected
                    ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
                    : "border-border hover:bg-background-subtle"
                }`}
              >
                {formatMyr(value)}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setCustomOpen(true)}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
              customOpen
                ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
                : "border-border hover:bg-background-subtle"
            }`}
          >
            {t("pages.topUp.custom")}
          </button>
        </div>

        {customOpen && (
          <input
            type="number"
            min={MIN_TOPUP_CENTS / 100}
            max={MAX_TOPUP_CENTS / 100}
            step="1"
            inputMode="decimal"
            value={customValue}
            onChange={(event) => applyCustom(event.target.value)}
            placeholder={t("pages.topUp.customPlaceholder")}
            className="mt-3 w-full max-w-xs rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
          />
        )}
      </div>

      <div className="border-t border-border pt-5">
        <p className="text-sm text-[color:var(--muted)]">{t("pages.topUp.total")}</p>
        <p className="mt-1 text-4xl font-bold tracking-tight">
          {formatMyr(amountCents, { decimals: true })}
        </p>
      </div>

      {state.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={!configured || !validAmount || isPending}
        className="inline-flex w-full items-center justify-center rounded-lg bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50 sm:w-auto sm:min-w-64"
      >
        {isPending ? t("pages.topUp.redirecting") : t("pages.topUp.continue")}
      </button>

      <p className="text-xs text-[color:var(--muted)]">{t("pages.topUp.secureBy")}</p>
    </form>
  );
}
