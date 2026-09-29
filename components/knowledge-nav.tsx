"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { KnowledgePermissions } from "@/lib/roles";
import { translateKnowledgeRole } from "@/lib/i18n/labels";
import { useI18n } from "@/lib/i18n/client";

type KnowledgeNavProps = {
  knowledge: KnowledgePermissions;
  active?: "sources" | "prompt" | "team" | "pricing" | "playground";
};

/** Sibling tabs that live under /dashboard/knowledge but are not Sources. */
const RESERVED_SEGMENTS = new Set(["sources", "prompt", "team", "pricing"]);

/**
 * Sources owns the workspace root and the per-file view
 * (/dashboard/knowledge/<id>), but not its sibling tabs.
 */
function isSourcesSection(pathname: string) {
  if (pathname === "/dashboard/knowledge") return true;
  const match = pathname.match(/^\/dashboard\/knowledge\/([^/]+)$/);
  return Boolean(match && !RESERVED_SEGMENTS.has(match[1]));
}

export function KnowledgeNav({ knowledge, active }: KnowledgeNavProps) {
  const { t } = useI18n();
  const pathname = usePathname();

  const tabs = [
    { href: "/dashboard/knowledge/sources", id: "sources" as const, badge: null as string | null },
    { href: "/dashboard/knowledge/prompt", id: "prompt" as const, badge: null as string | null },
    { href: "/dashboard/playground", id: "playground" as const, badge: null as string | null },
    ...(knowledge.canManageTeam
      ? [
          { href: "/dashboard/knowledge/pricing", id: "pricing" as const, badge: t("common.adminBadge") },
          { href: "/dashboard/knowledge/team", id: "team" as const, badge: t("common.adminBadge") },
        ]
      : []),
  ];

  return (
    <nav className="mb-8 flex flex-wrap items-center gap-2 border-b border-border pb-4">
      {tabs.map((tab) => {
        const isActive =
          active === tab.id ||
          (tab.id === "sources" && isSourcesSection(pathname)) ||
          pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={
              isActive
                ? "inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
                : "inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-[color:var(--muted)] transition hover:bg-background-subtle hover:text-foreground"
            }
          >
            {t(`knowledge.nav.${tab.id}`)}
            {tab.badge && (
              <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                {tab.badge}
              </span>
            )}
          </Link>
        );
      })}
      {knowledge.role && (
        <span className="ml-auto text-xs text-[color:var(--muted)]">
          {t("knowledge.nav.roleLabel")}{" "}
          <span className="font-medium text-foreground">
            {translateKnowledgeRole(t, knowledge.role)}
          </span>
        </span>
      )}
    </nav>
  );
}
