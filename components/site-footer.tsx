"use client";

import Link from "next/link";
import { LogoMark } from "@/components/brand";
import {
  CONSUMER_APP_NAME,
  CONSUMER_APP_URL,
} from "@/lib/brand";
import { useI18n } from "@/lib/i18n/client";

type FooterLink = { href: string; label: string; external?: boolean };

export function SiteFooter() {
  const { t } = useI18n();

  const footerNav: { heading: string; links: FooterLink[] }[] = [
    {
      heading: t("footer.developersHeading"),
      links: [
        { href: "/docs", label: t("nav.documentation") },
        { href: "/docs/endpoints", label: t("nav.apiReference") },
        { href: "/status", label: t("footer.systemStatus") },
        { href: "/docs/authentication", label: t("footer.authentication") },
        { href: "/#pricing", label: t("nav.pricing") },
      ],
    },
    {
      heading: t("footer.dashboardHeading"),
      links: [
        { href: "/signup", label: t("brand.getStarted") },
        { href: "/login", label: t("brand.signIn") },
        { href: "/dashboard", label: t("footer.overview") },
        { href: "/dashboard/playground", label: t("footer.playground") },
      ],
    },
    {
      heading: CONSUMER_APP_NAME,
      links: [
        {
          href: CONSUMER_APP_URL,
          label: t("brand.visitApp"),
          external: true,
        },
      ],
    },
  ];

  return (
    <footer className="border-t border-border bg-background-subtle">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5">
              <LogoMark className="h-9 w-9" />
              <span className="flex flex-col leading-none">
                <span className="font-semibold tracking-tight">Tanyalah Ustaz</span>
                <span className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-brand-600 dark:text-brand-500">
                  {t("brand.developers")}
                </span>
              </span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-[color:var(--muted)]">
              {t("footer.description", { consumerApp: CONSUMER_APP_NAME })}
            </p>
          </div>

          {footerNav.map((col) => (
            <div key={col.heading}>
              <h3 className="text-sm font-semibold text-foreground">{col.heading}</h3>
              <ul className="mt-4 space-y-3 text-sm">
                {col.links.map((link) => (
                  <li key={`${col.heading}-${link.label}`}>
                    {link.external ? (
                      <a
                        href={link.href}
                        className="text-[color:var(--muted)] transition hover:text-foreground"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {link.label} ↗
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-[color:var(--muted)] transition hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border pt-8 text-sm text-[color:var(--muted)] sm:flex-row sm:items-center">
          <p>{t("footer.copyright", { year: new Date().getFullYear() })}</p>
          <p className="text-xs">{t("footer.disclaimer")}</p>
        </div>
      </div>
    </footer>
  );
}
