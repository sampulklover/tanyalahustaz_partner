"use client";

import Link from "next/link";
import type { PartnerChatLog } from "@/lib/types";
import { useI18n } from "@/lib/i18n/client";

type ChatPreview = Pick<
  PartnerChatLog,
  "id" | "user_message" | "created_at"
>;

function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RecentChatsPreview({ chats }: { chats: ChatPreview[] }) {
  const { t } = useI18n();

  if (chats.length === 0) {
    return (
      <p className="text-sm text-[color:var(--muted)]">
        {t("recentChats.noRequestsYet")}{" "}
        <Link href="/dashboard/playground" className="text-brand-600 hover:underline dark:text-brand-500">
          {t("recentChats.tryItLive")}
        </Link>
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed text-left text-sm">
        <colgroup>
          <col className="w-[9.5rem]" />
          <col />
          <col className="w-[4.5rem]" />
        </colgroup>
        <thead className="border-b border-border text-xs uppercase tracking-wide text-[color:var(--muted)]">
          <tr>
            <th className="pb-3 font-medium">{t("common.time")}</th>
            <th className="pb-3 font-medium">{t("common.message")}</th>
            <th className="pb-3 font-medium text-right"> </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {chats.map((chat) => (
            <tr key={chat.id} className="hover:bg-background-subtle/30">
              <td className="whitespace-nowrap py-3 pr-4 text-xs text-[color:var(--muted)]">
                {formatTime(chat.created_at)}
              </td>
              <td className="py-3">
                <p className="line-clamp-1 font-medium">{truncate(chat.user_message, 72)}</p>
              </td>
              <td className="py-3 text-right">
                <Link
                  href="/dashboard/chat"
                  className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-500"
                >
                  {t("common.view")}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
