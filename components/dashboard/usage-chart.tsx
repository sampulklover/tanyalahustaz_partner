"use client";

import { useI18n } from "@/lib/i18n/client";

export type UsageDayPoint = {
  date: string;
  total: number;
};

export function UsageChart({ data }: { data: UsageDayPoint[] }) {
  const { t } = useI18n();

  const max = Math.max(1, ...data.map((point) => point.total));
  const sum = data.reduce((acc, point) => acc + point.total, 0);

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">{t("pages.usage.chartTitle")}</h2>
          <p className="mt-0.5 text-sm text-[color:var(--muted)]">
            {sum.toLocaleString()}
          </p>
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
            const value = point.total;
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
