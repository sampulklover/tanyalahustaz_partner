import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StatusBanner, UptimeBar } from "@/components/status/uptime-bar";
import { DEVELOPER_PORTAL_NAME } from "@/lib/brand";
import {
  STATUS_HISTORY_DAYS,
  STATUS_INCIDENTS,
  STATUS_SERVICES,
  buildServiceHistory,
  fetchApiHealth,
  overallStatus,
} from "@/lib/status-page";

export const metadata = {
  title: "System Status",
  description: `Current uptime and incident history for the ${DEVELOPER_PORTAL_NAME} API.`,
};

export default async function PublicStatusPage() {
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
          <h1 className="text-3xl font-bold tracking-tight">{DEVELOPER_PORTAL_NAME} Status</h1>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            Current status and {STATUS_HISTORY_DAYS}-day uptime for API services.
            {" "}
            <Link href="/dashboard/api-keys" className="text-brand-600 hover:underline dark:text-brand-500">
              Test your API key
            </Link>
          </p>
        </div>

        <StatusBanner level={systemLevel} />

        <p className="mt-3 text-xs text-[color:var(--muted)]">
          Last checked {new Date(health.checkedAt).toLocaleString()} · {health.latencyMs}ms · API{" "}
          {health.version}
        </p>

        <section className="mt-10 space-y-8">
          {STATUS_SERVICES.map((service) => {
            const current = histories[service.id]?.at(-1) ?? "operational";
            const currentLabel =
              current === "operational"
                ? "Operational"
                : current === "degraded"
                  ? "Degraded"
                  : "Outage";

            return (
              <div key={service.id} className="border-b border-border pb-8 last:border-0">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="font-semibold">{service.name}</h2>
                    <p className="mt-0.5 text-sm text-[color:var(--muted)]">{service.description}</p>
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
                <UptimeBar history={histories[service.id]} label={service.name} />
              </div>
            );
          })}
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-bold tracking-tight">Past incidents</h2>
          {incidents.length === 0 ? (
            <p className="mt-4 text-sm text-[color:var(--muted)]">
              No incidents reported in the last {STATUS_HISTORY_DAYS} days.
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
                          {incident.status}
                        </span>
                        <span className="text-[color:var(--muted)]"> — </span>
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
