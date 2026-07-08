"use client";

import { useState } from "react";
import { ChatLogDetail } from "@/components/chat-log-detail";
import {
  chatLogOrigin,
  formatChatLogTime,
  type ChatLogRow,
} from "@/lib/chat-logs";

function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

export function ChatLogsTable({ logs }: { logs: ChatLogRow[] }) {
  const [selected, setSelected] = useState<ChatLogRow | null>(null);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-left text-sm">
          <colgroup>
            <col className="w-[9.5rem]" />
            <col />
            <col className="w-[8rem]" />
            <col className="w-[11rem]" />
            <col className="w-[12rem]" />
            <col className="w-[5.5rem]" />
          </colgroup>
          <thead className="border-b border-border bg-background-subtle text-xs uppercase tracking-wide text-[color:var(--muted)]">
            <tr>
              <th className="px-5 py-3 font-medium">Time</th>
              <th className="px-5 py-3 font-medium">Message</th>
              <th className="px-5 py-3 font-medium">Origin</th>
              <th className="px-5 py-3 font-medium">Session</th>
              <th className="px-5 py-3 font-medium">Model</th>
              <th className="px-5 py-3 font-medium text-right"> </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {logs.map((log) => {
              const sourceCount = log.sources?.length ?? 0;
              const isSelected = selected?.id === log.id;

              return (
                <tr
                  key={log.id}
                  onClick={() => setSelected(log)}
                  className={`cursor-pointer transition ${
                    isSelected
                      ? "bg-brand-50/50 dark:bg-brand-900/20"
                      : "hover:bg-background-subtle/40"
                  }`}
                >
                  <td className="whitespace-nowrap px-5 py-3.5 text-[color:var(--muted)]" title={log.created_at}>
                    {formatChatLogTime(log.created_at)}
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="truncate font-medium">{truncate(log.user_message, 100)}</p>
                    {sourceCount > 0 && (
                      <p className="mt-0.5 text-xs text-[color:var(--muted)]">
                        {sourceCount} source{sourceCount === 1 ? "" : "s"}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-block truncate rounded-full px-2 py-0.5 text-xs font-medium ${
                        log.api_key_id
                          ? "bg-background-subtle text-foreground"
                          : "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
                      }`}
                    >
                      {chatLogOrigin(log)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-[color:var(--muted)]">
                    <span className="block truncate" title={log.session_id}>
                      {log.session_id.slice(0, 8)}…
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className="inline-block max-w-full truncate rounded-full bg-background-subtle px-2 py-0.5 text-xs"
                      title={log.model}
                    >
                      {log.model}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(log);
                      }}
                      className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-500"
                    >
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ChatLogDetail log={selected} onClose={() => setSelected(null)} />
    </>
  );
}
