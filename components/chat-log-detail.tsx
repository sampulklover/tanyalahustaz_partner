"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ChatMarkdown } from "@/components/chat-markdown";
import { CopyButton } from "@/components/copy-button";
import {
  buildChatLogsPath,
  chatLogOrigin,
  formatChatLogTimeFull,
  type ChatLogRow,
} from "@/lib/chat-logs";

export function ChatLogDetail({
  log,
  onClose,
}: {
  log: ChatLogRow | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!log) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [log, onClose]);

  if (!log) return null;

  const sourceCount = log.sources?.length ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close log detail"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-2xl flex-col border-l border-border bg-card shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
              Chat request
            </p>
            <p className="mt-1 text-sm text-[color:var(--muted)]">{formatChatLogTimeFull(log.created_at)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border transition hover:bg-background-subtle"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <dl className="grid gap-4 rounded-xl border border-border bg-background-subtle p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted)]">Origin</dt>
              <dd className="mt-1 font-medium">{chatLogOrigin(log)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted)]">Model</dt>
              <dd className="mt-1 font-mono text-xs">{log.model}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted)]">Session</dt>
              <dd className="mt-1 flex flex-wrap items-center gap-2">
                <code className="break-all font-mono text-xs">{log.session_id}</code>
                <CopyButton value={log.session_id} label="Copy ID" />
                <Link
                  href={buildChatLogsPath("/dashboard/chat", { session: log.session_id })}
                  className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-500"
                >
                  Filter by session
                </Link>
              </dd>
            </div>
          </dl>

          <div className="mt-6 space-y-6">
            <section>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                  User message
                </h3>
                <CopyButton value={log.user_message} label="Copy" />
              </div>
              <p className="rounded-xl border border-border bg-background-subtle p-4 text-sm leading-relaxed">
                {log.user_message}
              </p>
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-500">
                  Assistant response
                </h3>
                <CopyButton value={log.assistant_message} label="Copy" />
              </div>
              <div className="rounded-xl border border-border bg-background-subtle p-4 text-sm">
                <ChatMarkdown content={log.assistant_message} />
              </div>
            </section>

            {sourceCount > 0 && (
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                  Knowledge sources ({sourceCount})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {log.sources.map((source) => (
                    <span
                      key={source.slug}
                      className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
                    >
                      {source.title}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
