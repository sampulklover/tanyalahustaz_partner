"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { KnowledgePermissions } from "@/lib/roles";

type KnowledgeNavProps = {
  knowledge: KnowledgePermissions;
  active?: "articles" | "team";
};

function isArticlesSection(pathname: string) {
  return (
    pathname === "/dashboard/knowledge" ||
    pathname.startsWith("/dashboard/knowledge/new") ||
    /^\/dashboard\/knowledge\/[^/]+\/edit/.test(pathname)
  );
}

export function KnowledgeNav({ knowledge, active }: KnowledgeNavProps) {
  const pathname = usePathname();

  const tabs = [
    { href: "/dashboard/knowledge", label: "Articles", id: "articles" as const },
    ...(knowledge.canManageTeam
      ? [{ href: "/dashboard/knowledge/team", label: "Team", id: "team" as const }]
      : []),
  ];

  return (
    <nav className="mb-8 flex flex-wrap items-center gap-2 border-b border-border pb-4">
      {tabs.map((tab) => {
        const isActive =
          active === tab.id ||
          (tab.id === "articles" && isArticlesSection(pathname)) ||
          pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={
              isActive
                ? "rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
                : "rounded-lg px-4 py-2 text-sm font-medium text-[color:var(--muted)] transition hover:bg-background-subtle hover:text-foreground"
            }
          >
            {tab.label}
          </Link>
        );
      })}
      {knowledge.role && (
        <span className="ml-auto text-xs text-[color:var(--muted)]">
          Role: <span className="font-medium capitalize text-foreground">{knowledge.role}</span>
        </span>
      )}
    </nav>
  );
}
