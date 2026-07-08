import Link from "next/link";
import { ChatLogsFilters } from "@/components/chat-logs-filters";
import { ChatLogsTable } from "@/components/chat-logs-table";
import { DashboardPage as DashboardShell } from "@/components/dashboard/page";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Pagination } from "@/components/dashboard/pagination";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  buildChatLogsPath,
  CHAT_LOGS_PER_PAGE,
  parseChatLogsPage,
  sanitizeChatLogSearch,
  normalizeChatLogRow,
  type ChatLogsSearchParams,
} from "@/lib/chat-logs";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Chat Logs" };

export default async function ChatLogsPage({
  searchParams,
}: {
  searchParams: Promise<ChatLogsSearchParams>;
}) {
  const params = await searchParams;
  const page = parseChatLogsPage(params);
  const q = sanitizeChatLogSearch(params.q ?? "");
  const session = params.session?.trim() ?? "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const from = (page - 1) * CHAT_LOGS_PER_PAGE;
  const to = from + CHAT_LOGS_PER_PAGE - 1;
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  let logsQuery = supabase
    .from("partner_chat_logs")
    .select(
      "id, session_id, user_message, assistant_message, model, sources, created_at, api_key_id, api_keys(name, key_prefix)",
      { count: "exact" },
    )
    .eq("partner_id", user!.id)
    .order("created_at", { ascending: false });

  if (q) {
    logsQuery = logsQuery.or(
      `user_message.ilike.%${q}%,assistant_message.ilike.%${q}%,session_id.ilike.%${q}%`,
    );
  }

  if (session) {
    logsQuery = logsQuery.eq("session_id", session);
  }

  const [
    { data: logs, count },
    { count: totalAll },
    { count: last24hCount },
  ] = await Promise.all([
    logsQuery.range(from, to),
    supabase
      .from("partner_chat_logs")
      .select("*", { count: "exact", head: true })
      .eq("partner_id", user!.id),
    supabase
      .from("partner_chat_logs")
      .select("*", { count: "exact", head: true })
      .eq("partner_id", user!.id)
      .gte("created_at", last24h),
  ]);

  const items = (logs ?? []).map((row) => normalizeChatLogRow(row));
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / CHAT_LOGS_PER_PAGE));
  const filterQuery = { q: q || undefined, session: session || undefined };

  if (total > 0 && page > totalPages) {
    const { redirect } = await import("next/navigation");
    redirect(buildChatLogsPath("/dashboard/chat", filterQuery));
  }

  const hasFilters = Boolean(q || session);
  const showingEmptyFiltered = items.length === 0 && (totalAll ?? 0) > 0;

  return (
    <DashboardShell>
      <PageHeader
        title="Chat logs"
        description="Inspect requests sent via POST /api/v1/chat from your application or the playground."
        actions={
          <Link
            href="/dashboard/playground"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Open playground
          </Link>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total requests" value={(totalAll ?? 0).toLocaleString()} />
        <StatCard label="Last 24 hours" value={(last24hCount ?? 0).toLocaleString()} />
        <StatCard
          label={hasFilters ? "Matching filters" : "On this page"}
          value={hasFilters ? total.toLocaleString() : items.length.toLocaleString()}
        />
      </div>

      {showingEmptyFiltered ? (
        <EmptyState
          title="No matching logs"
          description="Try a different search term or clear your filters."
          action={{ href: buildChatLogsPath("/dashboard/chat", {}), label: "Clear filters" }}
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="No chat requests yet"
          description="Send a message from the playground or integrate the API in your application."
          action={{ href: "/dashboard/playground", label: "Try playground" }}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <ChatLogsFilters q={q || undefined} session={session || undefined} />
          <ChatLogsTable logs={items} />
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            perPage={CHAT_LOGS_PER_PAGE}
            basePath="/dashboard/chat"
            query={filterQuery}
          />
        </div>
      )}
    </DashboardShell>
  );
}
