import { TopUpForm } from "@/components/top-up-form";
import { DashboardPage as DashboardShell } from "@/components/dashboard/page";
import { PageHeader } from "@/components/dashboard/page-header";
import { isStripeConfigured } from "@/lib/stripe";
import { getTranslations } from "@/lib/i18n/server";

export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t("pages.topUp.title") };
}

type PageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function TopUpPage({ searchParams }: PageProps) {
  const t = await getTranslations();
  const params = await searchParams;
  const configured = isStripeConfigured();

  return (
    <DashboardShell>
      <PageHeader title={t("pages.topUp.title")} description={t("pages.topUp.description")} />

      <div className="space-y-6">
        {params.status === "success" && (
          <p className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800 dark:border-brand-900 dark:bg-brand-900/20 dark:text-brand-200">
            {t("pages.topUp.success")}
          </p>
        )}
        {params.status === "cancelled" && (
          <p className="rounded-lg border border-border bg-background-subtle px-4 py-3 text-sm text-[color:var(--muted)]">
            {t("pages.topUp.cancelled")}
          </p>
        )}
        {!configured && (
          <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            {t("pages.topUp.notConfigured")}
          </p>
        )}

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <TopUpForm configured={configured} />
        </div>
      </div>
    </DashboardShell>
  );
}
