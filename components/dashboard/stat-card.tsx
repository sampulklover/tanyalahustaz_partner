import Link from "next/link";
import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  href,
  linkLabel,
  external,
}: {
  label: string;
  value: string | number;
  href?: string;
  linkLabel?: string;
  external?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <p className="text-sm font-medium text-[color:var(--muted)]">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
      {href && linkLabel && (
        <Link
          href={href}
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className="mt-4 inline-flex text-sm font-medium text-brand-600 hover:underline dark:text-brand-500"
        >
          {linkLabel} {external ? "↗" : "→"}
        </Link>
      )}
    </div>
  );
}
