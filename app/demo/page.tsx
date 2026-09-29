import Link from "next/link";
import { Logo } from "@/components/brand";
import { PageHeader } from "@/components/dashboard/page-header";
import { LanguageSwitcher } from "@/components/language-switcher";
import { PartnerDemoSite } from "@/components/partner-demo-site";
import { ThemeToggle } from "@/components/theme-toggle";
import { getTranslations } from "@/lib/i18n/server";

export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t("pages.demo.title") };
}

export default async function DemoPage() {
  const t = await getTranslations();

  return (
    <div className="flex min-h-dvh flex-col bg-background-subtle">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-6">
          <Logo href="/dashboard" subtitle />
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 sm:flex">
              <ThemeToggle />
              <LanguageSwitcher />
            </div>
            <Link
              href="/dashboard"
              className="rounded-lg border border-border px-3 py-2 text-sm font-medium transition hover:bg-background-subtle"
            >
              {t("demo.backToDashboard")}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 sm:py-10">
        <PageHeader
          title={t("pages.demo.title")}
          description={t("pages.demo.description")}
        />
        <PartnerDemoSite />
      </main>
    </div>
  );
}
