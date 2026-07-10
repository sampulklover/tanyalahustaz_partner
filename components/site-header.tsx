"use client";

import Link from "next/link";
import { Logo } from "@/components/brand";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/lib/i18n/client";

export function SiteHeader() {
  const { t } = useI18n();

  const navLinks = [
    { href: "/docs", label: t("nav.documentation") },
    { href: "/docs/endpoints", label: t("nav.apiReference") },
    { href: "/status", label: t("nav.status") },
    { href: "/#pricing", label: t("nav.pricing") },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Logo subtitle />

        <nav className="hidden items-center gap-7 text-sm md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[color:var(--muted)] transition hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <LanguageSwitcher />
          <div className="h-4 w-px bg-border" />
          <Link
            href="/login"
            className="text-sm font-medium text-[color:var(--muted)] transition hover:text-foreground"
          >
            {t("brand.signIn")}
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            {t("brand.getStarted")}
          </Link>
        </div>

        <details className="group relative md:hidden">
          <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg border border-border text-foreground [&::-webkit-details-marker]:hidden">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="20" y2="17" />
            </svg>
          </summary>
          <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-card p-2 shadow-lg">
            <LanguageSwitcher variant="menu" />
            <div className="my-2 h-px bg-border" />
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-lg px-3 py-2 text-sm text-[color:var(--muted)] transition hover:bg-background-subtle hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
            <div className="my-2 h-px bg-border" />
            <Link
              href="/login"
              className="block rounded-lg px-3 py-2 text-sm text-[color:var(--muted)] transition hover:bg-background-subtle hover:text-foreground"
            >
              {t("brand.signIn")}
            </Link>
            <Link
              href="/signup"
              className="mt-1 block rounded-lg bg-brand-600 px-3 py-2 text-center text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              {t("brand.getStarted")}
            </Link>
          </div>
        </details>
      </div>
    </header>
  );
}
