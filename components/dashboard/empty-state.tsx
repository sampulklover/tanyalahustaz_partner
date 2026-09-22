import Link from "next/link";
import type { ReactNode } from "react";

function DefaultEmptyIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  children,
}: {
  title: string;
  description: string;
  action?: { href: string; label: string };
  icon?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400">
        {icon ?? <DefaultEmptyIcon />}
      </span>
      <p className="mt-4 font-semibold">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-[color:var(--muted)]">{description}</p>
      {children}
      {action && (
        <Link
          href={action.href}
          className="mt-6 inline-flex rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
