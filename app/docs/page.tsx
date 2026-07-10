import Link from "next/link";
import { CONSUMER_APP_NAME } from "@/lib/brand";
import { getMessages, getTranslations } from "@/lib/i18n/server";

export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t("docs.overview.title") };
}

export default async function DocsPage() {
  const t = await getTranslations();
  const messages = await getMessages();
  const overview = messages.docs.overview;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const playgroundLink = t("docs.overview.playgroundLink");
  const quickStartThird = overview.quickStartSteps[2];
  const [quickStartBefore, quickStartAfter = ""] = quickStartThird.split(playgroundLink);

  return (
    <article className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{t("docs.overview.title")}</h1>
      <p className="lead text-[color:var(--muted)]">
        {t("docs.overview.lead", { consumerApp: CONSUMER_APP_NAME })}
      </p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t("docs.overview.howItWorksTitle")}</h2>
        <ol className="list-decimal space-y-2 pl-5 text-[color:var(--muted)]">
          {overview.howItWorksSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t("docs.overview.baseUrlTitle")}</h2>
        <pre className="overflow-x-auto rounded-xl border border-border bg-background-subtle p-4 text-sm">
          {baseUrl}/api/v1
        </pre>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t("docs.overview.quickStartTitle")}</h2>
        <ol className="list-decimal space-y-2 pl-5 text-[color:var(--muted)]">
          <li>{overview.quickStartSteps[0]}</li>
          <li>{overview.quickStartSteps[1]}</li>
          <li>
            {quickStartBefore}
            <Link href="/dashboard/playground" className="text-brand-600 hover:underline dark:text-brand-500">
              {playgroundLink}
            </Link>
            {quickStartAfter}
          </li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t("docs.overview.exampleTitle")}</h2>
        <pre className="overflow-x-auto rounded-xl border border-border bg-background-subtle p-4 text-sm">
{`curl -X POST ${baseUrl}/api/v1/chat \\
  -H "Authorization: Bearer tlh_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"message":"Can a traveler combine Dhuhr and Asr?","category":"fiqh","session_id":"user-123"}'`}
        </pre>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t("docs.overview.openapiTitle")}</h2>
        <p className="text-[color:var(--muted)]">{t("docs.overview.openapiDescription")}</p>
        <p>
          <Link href="/docs/openapi" className="text-brand-600 hover:underline dark:text-brand-500">
            {t("docs.overview.openapiLink")} →
          </Link>
        </p>
      </section>
    </article>
  );
}
