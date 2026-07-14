import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StatusBanner, UptimeBar } from "@/components/status/uptime-bar";
import { DEVELOPER_PORTAL_NAME } from "@/lib/brand";
import { getTranslations } from "@/lib/i18n/server";
import { translateStatusLevel } from "@/lib/i18n/labels";
import {
  STATUS_HISTORY_DAYS,
  STATUS_INCIDENTS,
  STATUS_SERVICES,
  buildServiceHistory,
  fetchApiHealth,
  overallStatus,
} from "@/lib/status-page";

export async function generateMetadata() {
  const t = await getTranslations();
  return {
    title: t("pages.status.title"),
    description: t("pages.status.description"),
  };
}

export default async function PublicStatusPage() {
  const t = await getTranslations();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const health = await fetchApiHealth(baseUrl);
  const liveOperational = health.ok;

  const histories = Object.fromEntries(
    STATUS_SERVICES.map((service) => [
      service.id,
      buildServiceHistory(service.id, STATUS_INCIDENTS, liveOperational),
    ]),
  );

  const systemLevel = overallStatus(histories);
  const incidents = [...STATUS_INCIDENTS].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            {t("status.pageTitle", { portalName: DEVELOPER_PORTAL_NAME })}
          </h1>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            {t("status.pageDescription", { days: STATUS_HISTORY_DAYS })}
            {" "}
            <Link href="/dashboard/api-keys" className="text-brand-600 hover:underline dark:text-brand-500">
              {t("status.testApiKey")}
            </Link>
          </p>
        </div>

        <StatusBanner level={systemLevel} />

        <p className="mt-3 text-xs text-[color:var(--muted)]">
          {t("status.lastChecked", {
            time: new Date(health.checkedAt).toLocaleString(),
            latency: health.latencyMs,
            version: health.version,
          })}
        </p>

        <section className="mt-10 space-y-8">
          {STATUS_SERVICES.map((service) => {
            const current = histories[service.id]?.at(-1) ?? "operational";
            const currentLabel = translateStatusLevel(t, current);
            const serviceName = t(`status.services.${service.id}.name`);
            const serviceDescription = t(`status.services.${service.id}.description`);

            return (
              <div key={service.id} className="border-b border-border pb-8 last:border-0">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="font-semibold">{serviceName}</h2>
                    <p className="mt-0.5 text-sm text-[color:var(--muted)]">{serviceDescription}</p>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-medium ${
                      current === "operational"
                        ? "text-brand-600 dark:text-brand-500"
                        : current === "degraded"
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {currentLabel}
                  </span>
                </div>
                <UptimeBar history={histories[service.id]} label={serviceName} />
              </div>
            );
          })}
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-bold tracking-tight">{t("status.pastIncidents")}</h2>
          {incidents.length === 0 ? (
            <p className="mt-4 text-sm text-[color:var(--muted)]">
              {t("status.noIncidents", { days: STATUS_HISTORY_DAYS })}
            </p>
          ) : (
            <ul className="mt-6 space-y-8">
              {incidents.map((incident) => (
                <li key={incident.id} className="border-b border-border pb-8 last:border-0">
                  <p className="text-sm font-medium text-[color:var(--muted)]">
                    {new Date(incident.date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold">{incident.title}</h3>
                  <ul className="mt-4 space-y-3">
                    {incident.updates.map((update, index) => (
                      <li key={index} className="text-sm">
                        <span className="font-medium capitalize text-[color:var(--muted)]">
                          {t(`status.incidents.${incident.status}`)}
                        </span>
                        <span className="text-[color:var(--muted)]">: </span>
                        {update.message}
                        <span className="mt-0.5 block text-xs text-[color:var(--muted)]">
                          {update.time}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
