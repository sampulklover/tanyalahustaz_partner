import Link from "next/link";
import { getTranslations } from "@/lib/i18n/server";

export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t("docs.openapi.title") };
}

export default async function OpenApiDocsPage() {
  const t = await getTranslations();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const specUrl = `${baseUrl}/api/v1/openapi.json`;

  return (
    <article className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{t("docs.openapi.title")}</h1>
      <p className="text-[color:var(--muted)]">{t("docs.openapi.description")}</p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t("docs.openapi.specTitle")}</h2>
        <p className="text-sm text-[color:var(--muted)]">{t("docs.openapi.specDescription")}</p>
        <pre className="overflow-x-auto rounded-xl border border-border bg-background-subtle p-4 text-sm">
          {specUrl}
        </pre>
        <p className="text-sm">
          <Link
            href="/api/v1/openapi.json"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-600 hover:underline dark:text-brand-500"
          >
            {t("docs.openapi.openSpec")}
          </Link>
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t("docs.openapi.toolsTitle")}</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-[color:var(--muted)]">
          <li>{t("docs.openapi.toolsPostman")}</li>
          <li>{t("docs.openapi.toolsCodegen")}</li>
          <li>{t("docs.openapi.toolsSwagger")}</li>
        </ul>
      </section>
    </article>
  );
}
