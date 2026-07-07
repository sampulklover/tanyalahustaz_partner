"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const sections = [
  { href: "/docs", label: "Overview", exact: true },
  { href: "/docs/authentication", label: "Authentication" },
  { href: "/docs/endpoints", label: "API reference" },
];

export function DocsNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-24 space-y-1 text-sm">
      <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)]">
        Documentation
      </p>
      {sections.map((section) => {
        const active = section.exact
          ? pathname === section.href
          : pathname.startsWith(section.href);
        return (
          <Link
            key={section.href}
            href={section.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "block rounded-lg bg-brand-50 px-3 py-2 font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
                : "block rounded-lg px-3 py-2 text-[color:var(--muted)] transition hover:bg-background-subtle hover:text-foreground"
            }
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}
