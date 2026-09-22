"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/client";

export type UsageDayPoint = {
  date: string;
  total: number;
  chat: number;
};

type Series = "total" | "chat";

export function UsageChart({ data }: { data: UsageDayPoint[] }) {
  const { t } = useI18n();
  const [series, setSeries] = useState<Series>("total");

  const max = Math.max(1, ...data.map((point) => point[series]));
  const sum = data.reduce((acc, point) => acc + point[series], 0);

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">{t("pages.usage.chartTitle")}</h2>
          <p className="mt-0.5 text-sm text-[color:var(--muted)]">
            {sum.toLocaleString()}
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-border bg-background-subtle p-0.5">
          {(["total", "chat"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setSeries(value)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                series === value
                  ? "bg-card text-foreground shadow-sm"
                  : "text-[color:var(--muted)] hover:text-foreground"
              }`}
            >
              {value === "total" ? t("pages.usage.seriesAll") : t("pages.usage.seriesChat")}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-6 h-48">
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
          <div className="border-t border-border" />
          <div className="border-t border-border" />
          <div className="border-t border-border" />
        </div>
        <div className="absolute inset-0 flex items-end gap-[2px]">
          {data.map((point) => {
            const value = point[series];
            const height = value === 0 ? 0 : Math.max(4, (value / max) * 100);
            return (
              <div key={point.date} className="group flex h-full flex-1 items-end">
                <div
                  title={`${point.date}: ${value.toLocaleString()}`}
                  className="w-full rounded-t bg-brand-500/70 transition group-hover:bg-brand-600"
                  style={{ height: `${height}%` }}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-2 flex justify-between text-xs text-[color:var(--muted)]">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </section>
  );
}
