"use client";

import Link from "next/link";
import { buildChatLogsPath } from "@/lib/chat-logs";
import { useI18n } from "@/lib/i18n/client";

export function Pagination({
  page,
  totalPages,
  total,
  perPage,
  basePath,
  query,
}: {
  page: number;
  totalPages: number;
  total: number;
  perPage: number;
  basePath: string;
  query?: { q?: string; session?: string };
}) {
  const { t } = useI18n();

  if (totalPages <= 1) return null;

  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  function href(p: number) {
    return buildChatLogsPath(basePath, { ...query, page: p });
  }

  return (
    <div className="flex flex-col items-center justify-between gap-4 border-t border-border px-5 py-4 sm:flex-row">
      <p className="text-sm text-[color:var(--muted)]">
        {t("pagination.showing", { from, to, total })}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link
            href={href(page - 1)}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition hover:bg-background-subtle"
          >
            {t("common.previous")}
          </Link>
        ) : (
          <span className="rounded-lg border border-border px-3 py-1.5 text-sm text-[color:var(--muted)] opacity-50">
            {t("common.previous")}
          </span>
        )}
        <span className="px-2 text-sm text-[color:var(--muted)]">
          {t("pagination.page", { page, totalPages })}
        </span>
        {page < totalPages ? (
          <Link
            href={href(page + 1)}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition hover:bg-background-subtle"
          >
            {t("common.next")}
          </Link>
        ) : (
          <span className="rounded-lg border border-border px-3 py-1.5 text-sm text-[color:var(--muted)] opacity-50">
            {t("common.next")}
          </span>
        )}
      </div>
    </div>
  );
}
