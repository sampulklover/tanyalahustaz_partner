import type { ServiceStatusLevel } from "@/lib/status-page";

const BAR_COLORS: Record<ServiceStatusLevel, string> = {
  operational: "bg-brand-500",
  degraded: "bg-amber-500",
  outage: "bg-red-500",
};

export function UptimeBar({
  history,
  label,
}: {
  history: ServiceStatusLevel[];
  label: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex h-8 flex-1 items-end gap-px" role="img" aria-label={`${label} uptime over the last 90 days`}>
        {history.map((level, index) => (
          <span
            key={index}
            title={level}
            className={`min-w-0 flex-1 rounded-sm ${BAR_COLORS[level]} opacity-90`}
            style={{ height: level === "outage" ? "100%" : level === "degraded" ? "72%" : "48%" }}
          />
        ))}
      </div>
      <div className="hidden w-24 shrink-0 text-right text-xs text-[color:var(--muted)] sm:block">
        <span>90 days</span>
        <span className="mx-1">·</span>
        <span>Today</span>
      </div>
    </div>
  );
}

export function StatusBanner({ level }: { level: ServiceStatusLevel }) {
  const config = {
    operational: {
      className:
        "border-brand-200 bg-brand-50 text-brand-900 dark:border-brand-900 dark:bg-brand-950/40 dark:text-brand-100",
      label: "All systems operational",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ),
    },
    degraded: {
      className:
        "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100",
      label: "Partial system degradation",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      ),
    },
    outage: {
      className:
        "border-red-200 bg-red-50 text-red-950 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100",
      label: "Service disruption",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      ),
    },
  }[level];

  return (
    <div className={`flex items-center gap-3 rounded-xl border px-5 py-4 ${config.className}`}>
      {config.icon}
      <p className="text-lg font-semibold">{config.label}</p>
    </div>
  );
}
