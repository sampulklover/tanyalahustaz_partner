import { DashboardPage } from "@/components/dashboard/page";
import { PageHeader } from "@/components/dashboard/page-header";
import { PartnerDemoSite } from "@/components/partner-demo-site";
import { getTranslations } from "@/lib/i18n/server";

export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t("pages.demo.title") };
}

export default async function DemoPage() {
  const t = await getTranslations();

  return (
    <DashboardPage>
      <PageHeader
        title={t("pages.demo.title")}
        description={t("pages.demo.description")}
      />
      <PartnerDemoSite />
    </DashboardPage>
  );
}
