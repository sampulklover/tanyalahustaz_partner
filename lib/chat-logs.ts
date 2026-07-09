import type { PartnerChatLog } from "@/lib/types";

export const CHAT_LOGS_PER_PAGE = 20;

export type ChatLogRow = Pick<
  PartnerChatLog,
  | "id"
  | "session_id"
  | "user_message"
  | "assistant_message"
  | "model"
  | "sources"
  | "created_at"
  | "api_key_id"
> & {
  api_keys: { name: string; key_prefix: string } | null;
};

export type ChatLogsSearchParams = {
  page?: string;
  q?: string;
  session?: string;
};

export function sanitizeChatLogSearch(term: string) {
  return term.replace(/,/g, " ").trim();
}

export function getIsoTimestampHoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

export function parseChatLogsPage(searchParams: ChatLogsSearchParams) {
  return Math.max(1, Number(searchParams.page) || 1);
}

export function buildChatLogsPath(
  basePath: string,
  params: { page?: number; q?: string; session?: string },
) {
  const search = new URLSearchParams();
  if (params.q?.trim()) search.set("q", params.q.trim());
  if (params.session?.trim()) search.set("session", params.session.trim());
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const qs = search.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function formatChatLogTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatChatLogTimeFull(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  });
}

export function normalizeChatLogRow(
  row: Omit<ChatLogRow, "api_keys"> & {
    api_keys: { name: string; key_prefix: string } | { name: string; key_prefix: string }[] | null;
  },
): ChatLogRow {
  const key = Array.isArray(row.api_keys) ? (row.api_keys[0] ?? null) : row.api_keys;
  return { ...row, api_keys: key };
}

export function chatLogOrigin(log: ChatLogRow) {
  if (!log.api_key_id) return "Playground";
  const key = log.api_keys;
  if (!key) return "API";
  return key.name || `${key.key_prefix}…`;
}
