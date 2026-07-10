"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";

const sections: { href: string; key: string; exact?: boolean }[] = [
  { href: "/docs", key: "overview", exact: true },
  { href: "/docs/authentication", key: "authentication" },
  { href: "/docs/endpoints", key: "apiReference" },
  { href: "/docs/errors", key: "errors" },
  { href: "/docs/openapi", key: "openapi" },
];

export function DocsNav() {
  const { t } = useI18n();
  const pathname = usePathname();

  return (
    <nav className="sticky top-24 space-y-1 text-sm">
      <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)]">
        {t("docs.docsNav.heading")}
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
            {t(`docs.docsNav.${section.key}`)}
          </Link>
        );
      })}
    </nav>
  );
}
