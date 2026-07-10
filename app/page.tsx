import { HomePageContent } from "@/components/home-page-content";
import { getTranslations } from "@/lib/i18n/server";

export async function generateMetadata() {
  const t = await getTranslations();
  return {
    title: t("home.meta.title"),
    description: t("home.meta.description"),
  };
}

export default function HomePage() {
  return <HomePageContent />;
}
