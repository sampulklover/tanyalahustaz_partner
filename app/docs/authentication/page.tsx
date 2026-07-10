import { CONSUMER_APP_NAME, DASHBOARD_NAME } from "@/lib/brand";
import { getTranslations } from "@/lib/i18n/server";

export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t("docs.authentication.title") };
}

export default async function AuthenticationDocsPage() {
  const t = await getTranslations();

  return (
    <article className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{t("docs.authentication.title")}</h1>
      <p className="text-[color:var(--muted)]">
        {t("docs.authentication.lead", { dashboardLink: DASHBOARD_NAME })}
      </p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t("docs.authentication.loginVsAppTitle")}</h2>
        <p className="text-[color:var(--muted)]">
          {t("docs.authentication.loginVsAppBody", {
            signInLink: t("brand.signIn"),
            dashboardName: DASHBOARD_NAME,
            consumerAppLink: t("docs.authentication.consumerAppLink", { consumerApp: CONSUMER_APP_NAME }),
          })}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t("docs.authentication.apiKeyHeadersTitle")}</h2>
        <p className="text-[color:var(--muted)]">
          {t("docs.authentication.apiKeyHeadersDescription")}
        </p>
        <pre className="overflow-x-auto rounded-xl border border-border bg-background-subtle p-4 text-sm">
{`Authorization: Bearer tlh_live_...
# or
X-API-Key: tlh_live_...`}
        </pre>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t("docs.authentication.keyFormatTitle")}</h2>
        <p className="text-[color:var(--muted)]">
          {t("docs.authentication.keyFormatDescription")}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t("docs.authentication.dashboardVsApiTitle")}</h2>
        <p className="text-[color:var(--muted)]">
          {t("docs.authentication.dashboardVsApiDescription")}
        </p>
      </section>
    </article>
  );
}
