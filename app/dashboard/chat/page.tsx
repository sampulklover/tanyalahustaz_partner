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
  getIsoTimestampHoursAgo,
  parseChatLogsPage,
  sanitizeChatLogSearch,
  normalizeChatLogRow,
  type ChatLogsSearchParams,
} from "@/lib/chat-logs";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "@/lib/i18n/server";

export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t("pages.chatLogs.title") };
}

export default async function ChatLogsPage({
  searchParams,
}: {
  searchParams: Promise<ChatLogsSearchParams>;
}) {
  const t = await getTranslations();
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
  const last24h = getIsoTimestampHoursAgo(24);

  let logsQuery = supabase
    .from("partner_chat_logs")
    .select(
      "id, session_id, user_message, assistant_message, sources, created_at, api_key_id, api_keys(name, key_prefix)",
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
        title={t("pages.chatLogs.title")}
        description={t("pages.chatLogs.description")}
        actions={
          <Link
            href="/dashboard/playground"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            {t("pages.overview.tryItLive")}
          </Link>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label={t("pages.chatLogs.totalRequests")} value={(totalAll ?? 0).toLocaleString()} />
        <StatCard label={t("pages.chatLogs.last24Hours")} value={(last24hCount ?? 0).toLocaleString()} />
        <StatCard
          label={hasFilters ? t("pages.chatLogs.matchingFilters") : t("pages.chatLogs.onThisPage")}
          value={hasFilters ? total.toLocaleString() : items.length.toLocaleString()}
        />
      </div>

      {showingEmptyFiltered ? (
        <EmptyState
          title={t("pages.chatLogs.noMatchingLogs")}
          description={t("pages.chatLogs.noMatchingLogsDescription")}
          action={{ href: buildChatLogsPath("/dashboard/chat", {}), label: t("pages.chatLogs.clearFilters") }}
        />
      ) : items.length === 0 ? (
        <EmptyState
          title={t("pages.chatLogs.noChatRequestsYet")}
          description={t("pages.chatLogs.noChatRequestsDescription")}
          action={{ href: "/dashboard/playground", label: t("pages.overview.tryItLive") }}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <ChatLogsFilters
            key={`${q ?? ""}:${session ?? ""}`}
            q={q || undefined}
            session={session || undefined}
          />
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
