"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { signOut } from "@/app/actions/auth";
import { Logo, LogoMark } from "@/components/brand";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/lib/i18n/client";

type NavItem = {
  href: string;
  label: string;
  exact?: boolean;
  icon: ReactNode;
};

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "flex items-center gap-3 rounded-lg bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
          : "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[color:var(--muted)] transition hover:bg-background-subtle hover:text-foreground"
      }
    >
      <span className={active ? "text-brand-600 dark:text-brand-400" : ""}>{item.icon}</span>
      {item.label}
    </Link>
  );
}

function SidebarContent({
  email,
  knowledgeAccess,
  onNavigate,
}: {
  email: string;
  knowledgeAccess: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { t } = useI18n();

  const mainNav: NavItem[] = [
    {
      href: "/dashboard",
      label: t("dashboard.overview"),
      exact: true,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      ),
    },
    {
      href: "/dashboard/api-keys",
      label: t("dashboard.apiKeys"),
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
        </svg>
      ),
    },
    {
      href: "/dashboard/playground",
      label: t("dashboard.playground"),
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      ),
    },
    {
      href: "/dashboard/chat",
      label: t("dashboard.logs"),
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
  ];

  const knowledgeNav: NavItem = {
    href: "/dashboard/knowledge",
    label: t("dashboard.knowledge"),
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v14H6.5A2.5 2.5 0 0 0 4 19.5V5.5ZM4 19.5A2.5 2.5 0 0 0 6.5 22H20" />
      </svg>
    ),
  };

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const items = knowledgeAccess ? [...mainNav, knowledgeNav] : mainNav;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border p-5">
        <Logo href="/dashboard" subtitle />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)]">
          {t("brand.dashboard")}
        </p>
        {items.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActive(item.href, item.exact)}
            onNavigate={onNavigate}
          />
        ))}

        <p className="mb-2 mt-6 px-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)]">
          {t("dashboard.resources")}
        </p>
        <Link
          href="/docs"
          target="_blank"
          rel="noopener noreferrer"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[color:var(--muted)] transition hover:bg-background-subtle hover:text-foreground"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          {t("dashboard.documentation")}
          <svg
            className="ml-auto h-3.5 w-3.5 opacity-40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <path d="M15 3h6v6" />
            <path d="M10 14 21 3" />
          </svg>
        </Link>
        <LanguageSwitcher variant="sidebar" />
      </nav>

      <div className="shrink-0 border-t border-border p-4">
        <p className="truncate text-xs text-[color:var(--muted)]" title={email}>
          {email}
        </p>
        <form action={signOut} className="mt-2">
          <button
            type="submit"
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-[color:var(--muted)] transition hover:bg-background-subtle hover:text-foreground"
          >
            {t("dashboard.signOut")}
          </button>
        </form>
      </div>
    </div>
  );
}

export function DashboardSidebar({
  email,
  knowledgeAccess,
}: {
  email: string;
  knowledgeAccess: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useI18n();

  return (
    <>
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
        <div className="flex items-center gap-2.5">
          <LogoMark className="h-8 w-8" />
          <span className="text-sm font-semibold">{t("brand.developers")}</span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border"
          aria-label={t("nav.openMenu")}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="20" y2="17" />
          </svg>
        </button>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label={t("nav.closeMenu")}
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 bg-card shadow-xl">
            <SidebarContent
              email={email}
              knowledgeAccess={knowledgeAccess}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}

      <aside className="hidden w-60 shrink-0 overflow-hidden border-r border-border bg-card lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:flex-col">
        <SidebarContent email={email} knowledgeAccess={knowledgeAccess} />
      </aside>
    </>
  );
}
