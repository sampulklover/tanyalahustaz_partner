"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { buildChatLogsPath } from "@/lib/chat-logs";

export function ChatLogsFilters({
  q,
  session,
}: {
  q?: string;
  session?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(q ?? "");

  useEffect(() => {
    setQuery(q ?? "");
  }, [q]);

  function applyFilters(next: { q?: string; session?: string }) {
    router.push(
      buildChatLogsPath("/dashboard/chat", {
        q: next.q,
        session: next.session,
      }),
    );
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    applyFilters({ q: query, session });
  }

  return (
    <div className="border-b border-border bg-background-subtle/50 px-5 py-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--muted)]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages or session ID…"
            className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
          />
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Search
          </button>
          {(q || session) && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                applyFilters({});
              }}
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition hover:bg-background-subtle"
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {session && (
        <div className="mt-3 flex items-center gap-2 text-sm">
          <span className="text-[color:var(--muted)]">Session:</span>
          <code className="rounded bg-card px-2 py-0.5 font-mono text-xs">{session}</code>
          <button
            type="button"
            onClick={() => applyFilters({ q })}
            className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-500"
          >
            Remove filter
          </button>
        </div>
      )}
    </div>
  );
}
