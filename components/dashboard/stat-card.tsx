import Link from "next/link";
import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  href,
  linkLabel,
  external,
  icon,
}: {
  label: string;
  value: string | number;
  href?: string;
  linkLabel?: string;
  external?: boolean;
  icon?: ReactNode;
}) {
  return (
    <div className="group flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition hover:border-brand-200 hover:shadow-md dark:hover:border-brand-900">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-[color:var(--muted)]">{label}</p>
        {icon && (
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400">
            {icon}
          </span>
        )}
      </div>
      <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
      {href && linkLabel && (
        <Link
          href={href}
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline dark:text-brand-500"
        >
          {linkLabel}
          <span aria-hidden className="transition group-hover:translate-x-0.5">
            {external ? "↗" : "→"}
          </span>
        </Link>
      )}
    </div>
  );
}
