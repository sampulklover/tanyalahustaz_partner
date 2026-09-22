"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";

const selectClass =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30";

export function UsageFilters({
  keys,
  range,
  selectedKey,
}: {
  keys: { id: string; name: string }[];
  range: string;
  selectedKey: string;
}) {
  const router = useRouter();
  const { t } = useI18n();

  function apply(next: { range?: string; key?: string }) {
    const nextRange = next.range ?? range;
    const nextKey = next.key ?? selectedKey;
    const params = new URLSearchParams();
    params.set("range", nextRange);
    if (nextKey && nextKey !== "all") params.set("key", nextKey);
    router.push(`/dashboard/usage?${params.toString()}`);
  }

  const filtered = range !== "30" || selectedKey !== "all";

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
      <label className="flex items-center gap-2 text-sm">
        <span className="text-[color:var(--muted)]">{t("pages.usage.range")}</span>
        <select
          className={selectClass}
          value={range}
          onChange={(event) => apply({ range: event.target.value })}
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
          onChange={(event) => apply({ key: event.target.value })}
        >
          <option value="all">{t("pages.usage.allKeys")}</option>
          {keys.map((key) => (
            <option key={key.id} value={key.id}>
              {key.name}
            </option>
          ))}
        </select>
      </label>

      {filtered && (
        <button
          type="button"
          onClick={() => router.push("/dashboard/usage")}
          className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-500"
        >
          {t("pages.usage.clearFilters")}
        </button>
      )}
    </div>
  );
}
