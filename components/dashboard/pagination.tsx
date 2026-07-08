import Link from "next/link";
import { buildChatLogsPath } from "@/lib/chat-logs";

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
  if (totalPages <= 1) return null;

  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  function href(p: number) {
    return buildChatLogsPath(basePath, { ...query, page: p });
  }

  return (
    <div className="flex flex-col items-center justify-between gap-4 border-t border-border px-5 py-4 sm:flex-row">
      <p className="text-sm text-[color:var(--muted)]">
        Showing <span className="font-medium text-foreground">{from}–{to}</span> of{" "}
        <span className="font-medium text-foreground">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link
            href={href(page - 1)}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition hover:bg-background-subtle"
          >
            Previous
          </Link>
        ) : (
          <span className="rounded-lg border border-border px-3 py-1.5 text-sm text-[color:var(--muted)] opacity-50">
            Previous
          </span>
        )}
        <span className="px-2 text-sm text-[color:var(--muted)]">
          Page {page} of {totalPages}
        </span>
        {page < totalPages ? (
          <Link
            href={href(page + 1)}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition hover:bg-background-subtle"
          >
            Next
          </Link>
        ) : (
          <span className="rounded-lg border border-border px-3 py-1.5 text-sm text-[color:var(--muted)] opacity-50">
            Next
          </span>
        )}
      </div>
    </div>
  );
}
