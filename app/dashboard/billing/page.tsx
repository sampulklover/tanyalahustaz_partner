import Link from "next/link";
import { DashboardPage as DashboardShell } from "@/components/dashboard/page";
import { PageHeader } from "@/components/dashboard/page-header";
import { LowBalanceAlerts } from "@/components/low-balance-alerts";
import { ReceiptModal } from "@/components/receipt-modal";
import { formatMyr } from "@/lib/billing";
import { getCreditBalanceCents } from "@/lib/credit";
import { getLowBalanceSettings } from "@/lib/credit-alerts";
import { isEmailConfigured } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "@/lib/i18n/server";
import type { Translator } from "@/lib/i18n/translator";

export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t("pages.billing.title") };
}

type BillingRow = {
  id: string;
  amount_cents: number;
  currency: string;
  status: string;
  payment_method: string | null;
  receipt_url: string | null;
  provider_bill_code: string | null;
  provider_payment_id: string | null;
  created_at: string;
  paid_at: string | null;
};

type LedgerRow = {
  id: string;
  delta_cents: number;
  reason: string;
  reference: string | null;
  created_at: string;
};

function reasonLabel(t: Translator, reason: string) {
  switch (reason) {
    case "topup":
      return t("pages.billing.reasonTopup");
    case "usage":
      return t("pages.billing.reasonUsage");
    case "embedding":
      return t("pages.billing.reasonEmbedding");
    case "refund":
      return t("pages.billing.reasonRefund");
    case "adjustment":
      return t("pages.billing.reasonAdjustment");
    default:
      return reason;
  }
}

function statusStyle(status: string) {
  switch (status) {
    case "paid":
      return "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200";
    case "pending":
      return "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200";
    case "failed":
      return "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300";
    default:
      return "bg-background-subtle text-[color:var(--muted)]";
  }
}

function statusLabel(t: Translator, status: string) {
  switch (status) {
    case "paid":
      return t("pages.billing.statusPaid");
    case "pending":
      return t("pages.billing.statusPending");
    case "failed":
      return t("pages.billing.statusFailed");
    case "refunded":
      return t("pages.billing.statusRefunded");
    default:
      return status;
  }
}

export default async function BillingPage() {
  const t = await getTranslations();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("billing_transactions")
    .select(
      "id, amount_cents, currency, status, payment_method, receipt_url, provider_bill_code, provider_payment_id, created_at, paid_at",
    )
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, company_name")
    .eq("id", user!.id)
    .maybeSingle();

  const billedTo =
    profile?.company_name?.trim() || profile?.email || user!.email || "—";

  const rows = (data ?? []) as BillingRow[];

  const { data: ledgerData } = await supabase
    .from("credit_ledger")
    .select("id, delta_cents, reason, reference, created_at")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const ledger = (ledgerData ?? []) as LedgerRow[];

  const totalPaidCents = rows
    .filter((row) => row.status === "paid")
    .reduce((sum, row) => sum + (row.amount_cents ?? 0), 0);
  const balanceCents = await getCreditBalanceCents(user!.id);
  const alertSettings = await getLowBalanceSettings(user!.id);
  const emailConfigured = isEmailConfigured();

  // Spend by type across the whole ledger (not just the 50 shown below), so the
  // summary is accurate. Only negative deltas are charges.
  const { data: spendData } = await supabase
    .from("credit_ledger")
    .select("delta_cents, reason")
    .eq("user_id", user!.id)
    .lt("delta_cents", 0);

  const spendByReason = new Map<string, number>();
  for (const entry of (spendData ?? []) as Array<{ delta_cents: number; reason: string }>) {
    spendByReason.set(
      entry.reason,
      (spendByReason.get(entry.reason) ?? 0) + Math.abs(entry.delta_cents),
    );
  }

  const spendRows = [...spendByReason.entries()]
    .map(([reason, cents]) => ({ reason, cents }))
    .sort((a, b) => b.cents - a.cents);

  return (
    <DashboardShell>
      <PageHeader
        title={t("pages.billing.title")}
        description={t("pages.billing.description")}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-5 shadow-sm dark:border-brand-900 dark:bg-brand-900/20">
          <p className="text-sm font-medium text-brand-800 dark:text-brand-200">
            {t("pages.billing.balance")}
          </p>
          <p className="mt-2 text-4xl font-bold tracking-tight">
            {formatMyr(balanceCents, { decimals: true })}
          </p>
          <p className="mt-1 text-xs text-brand-700/80 dark:text-brand-300/80">
            {t("pages.billing.balanceHint")}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm font-medium text-[color:var(--muted)]">
            {t("pages.billing.totalToppedUp")}
          </p>
          <p className="mt-2 text-4xl font-bold tracking-tight">
            {formatMyr(totalPaidCents, { decimals: true })}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm font-medium text-[color:var(--muted)]">
            {t("pages.billing.payments")}
          </p>
          <p className="mt-2 text-4xl font-bold tracking-tight">{rows.length.toLocaleString()}</p>
        </div>
      </div>

      <LowBalanceAlerts
        thresholdCents={alertSettings.thresholdCents}
        emailConfigured={emailConfigured}
      />

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {rows.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <p className="font-medium">{t("pages.billing.empty")}</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-[color:var(--muted)]">
              {t("pages.billing.emptyDescription")}
            </p>
            <Link
              href="/dashboard/top-up"
              className="mt-6 inline-flex rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              {t("pages.billing.topUpCta")}
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-[color:var(--muted)]">
                <tr className="border-b border-border">
                  <th className="px-5 py-3 font-medium">{t("pages.billing.invoice")}</th>
                  <th className="px-5 py-3 font-medium">{t("pages.billing.status")}</th>
                  <th className="px-5 py-3 font-medium">{t("pages.billing.amount")}</th>
                  <th className="px-5 py-3 font-medium">{t("pages.billing.method")}</th>
                  <th className="px-5 py-3 font-medium">{t("pages.billing.created")}</th>
                  <th className="px-5 py-3 font-medium">{t("pages.billing.receipt")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3.5 font-mono text-xs text-[color:var(--muted)]">
                      {row.id.slice(0, 8)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle(row.status)}`}
                      >
                        {statusLabel(t, row.status)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-medium">
                      {formatMyr(row.amount_cents, { decimals: true })}
                    </td>
                    <td className="px-5 py-3.5 text-xs capitalize text-[color:var(--muted)]">
                      {row.payment_method ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[color:var(--muted)]">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      {row.receipt_url ? (
                        <a
                          href={row.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-brand-600 hover:underline dark:text-brand-500"
                        >
                          {t("pages.billing.download")}
                        </a>
                      ) : row.status === "paid" ? (
                        <ReceiptModal receipt={row} billedTo={billedTo} />
                      ) : (
                        <span className="text-[color:var(--muted)]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <section className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold">{t("pages.billing.spendTitle")}</h2>
          <p className="mt-1 text-xs text-[color:var(--muted)]">
            {t("pages.billing.spendHint")}
          </p>
        </div>
        {spendRows.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-[color:var(--muted)]">
            {t("pages.billing.spendEmpty")}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {spendRows.map((row) => (
              <li
                key={row.reason}
                className="flex items-center justify-between gap-3 px-5 py-3.5 text-sm"
              >
                <span>{reasonLabel(t, row.reason)}</span>
                <span className="font-medium">
                  {formatMyr(row.cents, { decimals: true })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold">{t("pages.billing.activity")}</h2>
          <p className="mt-1 text-xs text-[color:var(--muted)]">
            {t("pages.billing.activityDescription")}
          </p>
        </div>
        {ledger.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-[color:var(--muted)]">
            {t("pages.billing.activityEmpty")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-[color:var(--muted)]">
                <tr className="border-b border-border">
                  <th className="px-5 py-3 font-medium">{t("pages.billing.created")}</th>
                  <th className="px-5 py-3 font-medium">{t("pages.billing.type")}</th>
                  <th className="px-5 py-3 font-medium">{t("pages.billing.amount")}</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((entry) => (
                  <tr key={entry.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3.5 text-xs text-[color:var(--muted)]">
                      {new Date(entry.created_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5">{reasonLabel(t, entry.reason)}</td>
                    <td
                      className={`px-5 py-3.5 font-medium ${
                        entry.delta_cents >= 0
                          ? "text-brand-600 dark:text-brand-500"
                          : "text-[color:var(--muted)]"
                      }`}
                    >
                      {entry.delta_cents >= 0 ? "+" : "−"}
                      {formatMyr(Math.abs(entry.delta_cents), { decimals: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
