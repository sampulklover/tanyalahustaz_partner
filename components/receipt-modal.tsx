"use client";

import { useEffect, useState } from "react";
import { formatMyr } from "@/lib/billing";
import { useI18n } from "@/lib/i18n/client";

export type ReceiptData = {
  id: string;
  amount_cents: number;
  status: string;
  payment_method: string | null;
  provider_payment_id: string | null;
  provider_bill_code: string | null;
  created_at: string;
  paid_at: string | null;
};

export function ReceiptModal({ receipt, billedTo }: { receipt: ReceiptData; billedTo: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const date = receipt.paid_at ?? receipt.created_at;

  useEffect(() => {
    if (!open) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-medium text-brand-600 hover:underline dark:text-brand-500"
      >
        {t("pages.billing.view")}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label={t("common.close")}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50"
          />
          <div
            role="dialog"
            aria-modal="true"
            className="receipt-printable relative z-10 w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-4 border-b border-border pb-5">
              <div>
                <p className="text-lg font-semibold">Tanyalah Ustaz</p>
                <p className="text-xs text-[color:var(--muted)]">API credit</p>
              </div>
              <p className="text-right text-xs text-[color:var(--muted)]">
                {t("pages.billing.receiptNumber")}
                <br />
                <span className="font-mono text-foreground">{receipt.id.slice(0, 8)}</span>
              </p>
            </div>

            <dl className="grid gap-4 py-5 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-[color:var(--muted)]">
                  {t("pages.billing.billedTo")}
                </dt>
                <dd className="mt-1 text-sm font-medium">{billedTo}</dd>
              </div>
              <div className="sm:text-right">
                <dt className="text-xs uppercase tracking-wide text-[color:var(--muted)]">
                  {t("pages.billing.date")}
                </dt>
                <dd className="mt-1 text-sm">{new Date(date).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-[color:var(--muted)]">
                  {t("pages.billing.method")}
                </dt>
                <dd className="mt-1 text-sm">{receipt.payment_method ?? "—"}</dd>
              </div>
              <div className="sm:text-right">
                <dt className="text-xs uppercase tracking-wide text-[color:var(--muted)]">
                  {t("pages.billing.reference")}
                </dt>
                <dd className="mt-1 font-mono text-xs">
                  {receipt.provider_payment_id ?? receipt.provider_bill_code ?? "—"}
                </dd>
              </div>
            </dl>

            <div className="flex items-center justify-between border-t border-border pt-5">
              <span className="text-sm font-medium">{t("pages.billing.amount")}</span>
              <span className="text-2xl font-bold tracking-tight">
                {formatMyr(receipt.amount_cents, { decimals: true })}
              </span>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 print:hidden">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition hover:bg-background-subtle"
              >
                {t("common.close")}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                {t("pages.billing.print")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
