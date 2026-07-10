import Link from "next/link";
import { DashboardPage as DashboardShell } from "@/components/dashboard/page";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Panel } from "@/components/dashboard/panel";
import { OnboardingChecklist } from "@/components/dashboard/onboarding";
import { QuickStartSnippet } from "@/components/dashboard/quick-start";
import { EmptyState } from "@/components/dashboard/empty-state";
import { RecentChatsPreview } from "@/components/dashboard/recent-chats-preview";
import { createClient } from "@/lib/supabase/server";
import type { ApiUsageEntry, PartnerChatLog } from "@/lib/types";
import { getDashboardContext } from "@/lib/dashboard";
import { getTranslations } from "@/lib/i18n/server";

export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t("pages.overview.title") };
}

function statusBadge(code: number) {
  const ok = code >= 200 && code < 300;
  return (
    <span
      className={`rounded px-1.5 py-0.5 font-mono text-xs ${
        ok
          ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
          : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
      }`}
    >
      {code}
    </span>
  );
}

export default async function DashboardPage() {
  const t = await getTranslations();
  const supabase = await createClient();
  const context = await getDashboardContext();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const [
    { data: profile },
    { count: activeKeys },
    { count: chatCount },
    { count: knowledgeCount },
    { data: recentUsage },
    { data: recentChats },
  ] = await Promise.all([
    supabase.from("profiles").select("company_name, created_at").eq("id", user!.id).single(),
    supabase
      .from("api_keys")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user!.id)
      .is("revoked_at", null),
    supabase
      .from("partner_chat_logs")
      .select("*", { count: "exact", head: true })
      .eq("partner_id", user!.id),
    supabase
      .from("knowledge_articles")
      .select("*", { count: "exact", head: true })
      .eq("published", true),
    supabase
      .from("api_usage")
      .select("id, endpoint, method, status_code, created_at, api_key_id")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("partner_chat_logs")
      .select("id, user_message, created_at")
      .eq("partner_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const usage = (recentUsage ?? []) as ApiUsageEntry[];
  const chats = (recentChats ?? []) as Pick<
    PartnerChatLog,
    "id" | "user_message" | "created_at"
  >[];

  const isNewUser = (activeKeys ?? 0) === 0;

  const welcomeTitle = profile?.company_name
    ? t("pages.overview.welcomeBackWithCompany", { company: profile.company_name })
    : t("pages.overview.welcomeBack");

  return (
    <DashboardShell>
      <PageHeader
        title={welcomeTitle}
        description={t("pages.overview.description")}
        actions={
          <Link
            href="/dashboard/playground"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            {t("pages.overview.tryItLive")}
          </Link>
        }
      />

      {isNewUser && (
        <div className="mb-8">
          <OnboardingChecklist />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("pages.overview.activeApiKeys")}
          value={activeKeys ?? 0}
          href="/dashboard/api-keys"
          linkLabel={t("pages.overview.manageKeys")}
        />
        <StatCard
          label={t("pages.overview.chatRequests")}
          value={chatCount ?? 0}
          href="/dashboard/chat"
          linkLabel={t("pages.overview.viewLogs")}
        />
        <StatCard
          label={t("pages.overview.knowledgeArticles")}
          value={knowledgeCount ?? 0}
          href={context?.knowledge.canViewKnowledge ? "/dashboard/knowledge" : "/docs/endpoints"}
          linkLabel={
            context?.knowledge.canViewKnowledge
              ? t("pages.overview.manage")
              : t("pages.overview.apiDocs")
          }
        />
        <StatCard
          label={t("pages.overview.apiVersion")}
          value="v1"
          href="/docs"
          linkLabel={t("pages.overview.documentation")}
          external
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <QuickStartSnippet baseUrl={baseUrl} />

        <Panel
          title={t("pages.overview.recentApiActivity")}
          description={t("pages.overview.recentApiActivityDescription")}
          action={
            <Link
              href="/docs/endpoints"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-brand-600 hover:underline dark:text-brand-500"
            >
              {t("common.apiReferenceLink")} ↗
            </Link>
          }
        >
          {usage.length === 0 ? (
            <EmptyState
              title={t("pages.overview.noApiCallsYet")}
              description={t("pages.overview.noApiCallsDescription")}
              action={{ href: "/dashboard/api-keys", label: t("pages.overview.createApiKey") }}
            />
          ) : (
            <ul className="divide-y divide-border">
              {usage.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-background-subtle px-1.5 py-0.5 font-mono text-xs">
                        {entry.method}
                      </span>
                      <code className="truncate text-xs">{entry.endpoint}</code>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-xs text-[color:var(--muted)]">
                    {statusBadge(entry.status_code ?? 0)}
                    <time>{new Date(entry.created_at).toLocaleString()}</time>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-6">
        <Panel
          title={t("pages.overview.recentChatRequests")}
          description={t("pages.overview.recentChatRequestsDescription")}
          action={
            <Link href="/dashboard/chat" className="text-sm text-brand-600 hover:underline dark:text-brand-500">
              {t("pages.overview.viewAllLogs")}
            </Link>
          }
        >
          <RecentChatsPreview chats={chats} />
        </Panel>
      </div>
    </DashboardShell>
  );
}
