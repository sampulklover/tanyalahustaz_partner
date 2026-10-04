"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StatCard } from "@/components/dashboard/stat-card";
import { UsageChart } from "@/components/dashboard/usage-chart";
import { useI18n } from "@/lib/i18n/client";

export type UsageKeyStats = {
  perDay: number[];
  success: number;
  error: number;
};

const selectClass =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30";

export function UsageView({
  keys,
  days,
  rangeDays,
  initialKey,
  byKey,
}: {
  keys: { id: string; name: string }[];
  days: string[];
  rangeDays: number;
  initialKey: string;
  byKey: Record<string, UsageKeyStats>;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [selectedKey, setSelectedKey] = useState(initialKey);

  const range = String(rangeDays);
  const stats =
    byKey[selectedKey] ??
    byKey.all ?? { perDay: days.map(() => 0), success: 0, error: 0 };

  const total = stats.perDay.reduce((sum, value) => sum + value, 0);
  const avgPerDay = Math.round(total / rangeDays);

  const chartData = days.map((date, index) => ({
    date,
    total: stats.perDay[index] ?? 0,
  }));

  const hasData = total > 0;
  const isFiltered = range !== "30" || selectedKey !== "all";

  function applyRange(nextRange: string) {
    const params = new URLSearchParams();
    params.set("range", nextRange);
    if (selectedKey && selectedKey !== "all") params.set("key", selectedKey);
    startTransition(() => {
      router.push(`/dashboard/usage?${params.toString()}`);
    });
  }

  function applyKey(nextKey: string) {
    setSelectedKey(nextKey);
    const params = new URLSearchParams();
    params.set("range", range);
    if (nextKey && nextKey !== "all") params.set("key", nextKey);
    // Update the URL without triggering a server round trip — filtering is instant.
    window.history.replaceState(null, "", `/dashboard/usage?${params.toString()}`);
  }

  return (
    <div className={isPending ? "opacity-60 transition-opacity" : "transition-opacity"}>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-5 shadow-sm dark:border-brand-900 dark:bg-brand-900/20 sm:col-span-1">
          <p className="text-sm font-medium text-brand-800 dark:text-brand-200">
            {t("pages.usage.totalRequests")}
          </p>
          <p className="mt-2 text-4xl font-bold tracking-tight">{total.toLocaleString()}</p>
        </div>
        <StatCard label={t("pages.usage.successful")} value={stats.success.toLocaleString()} />
        <StatCard label={t("pages.usage.errors")} value={stats.error.toLocaleString()} />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-[color:var(--muted)]">{t("pages.usage.range")}</span>
          <select
            className={selectClass}
            value={range}
            disabled={isPending}
            onChange={(event) => applyRange(event.target.value)}
          >
            <option value="7">{t("pages.usage.last7Days")}</option>
            <option value="30">{t("pages.usage.last30Days")}</option>
            <option value="90">{t("pages.usage.last90Days")}</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm">
          <span className="text-[color:var(--muted)]">{t("pages.usage.apiKey")}</span>
          <select
            className={selectClass}
            value={selectedKey}
            onChange={(event) => applyKey(event.target.value)}
          >
            <option value="all">{t("pages.usage.allKeys")}</option>
            {keys.map((key) => (
              <option key={key.id} value={key.id}>
                {key.name}
              </option>
            ))}
          </select>
        </label>

        <span className="text-xs text-[color:var(--muted)]">
          {t("pages.usage.avgPerDay")}:{" "}
          <span className="font-medium text-foreground">{avgPerDay.toLocaleString()}</span>
        </span>

        {isFiltered && (
          <button
            type="button"
            onClick={() => {
              setSelectedKey("all");
              startTransition(() => {
                router.push("/dashboard/usage?range=30");
              });
            }}
            className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-500"
          >
            {t("pages.usage.clearFilters")}
          </button>
        )}
      </div>

      <div className="mt-6">
        {hasData ? (
          <UsageChart data={chartData} />
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-card px-5 py-14 text-center">
            <p className="font-medium">{t("pages.usage.empty")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
