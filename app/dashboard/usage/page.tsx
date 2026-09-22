import { DashboardPage as DashboardShell } from "@/components/dashboard/page";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { UsageChart } from "@/components/dashboard/usage-chart";
import { UsageFilters } from "@/components/dashboard/usage-filters";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "@/lib/i18n/server";
import { getUsageDayKeys, getUsageSinceIso, resolveUsageRange } from "@/lib/usage";

export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t("pages.usage.title") };
}

type PageProps = {
  searchParams: Promise<{ range?: string; key?: string }>;
};

export default async function UsagePage({ searchParams }: PageProps) {
  const t = await getTranslations();
  const params = await searchParams;
  const rangeDays = resolveUsageRange(params.range);
  const selectedKey = params.key?.trim() || "all";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const since = getUsageSinceIso(rangeDays);

  const { data: keysData } = await supabase
    .from("api_keys")
    .select("id, name, revoked_at")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  const keys = (keysData ?? []).map((key) => ({ id: key.id as string, name: key.name as string }));

  let usageQuery = supabase
    .from("api_usage")
    .select("created_at, status_code, api_key_id")
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(20000);

  if (selectedKey !== "all") {
    usageQuery = usageQuery.eq("api_key_id", selectedKey);
  }

  let chatQuery = supabase
    .from("partner_chat_logs")
    .select("created_at, api_key_id")
    .eq("partner_id", user!.id)
    .gte("created_at", since)
    .limit(20000);

  if (selectedKey !== "all") {
    chatQuery = chatQuery.eq("api_key_id", selectedKey);
  }

  const [{ data: usageRows }, { data: chatRows }] = await Promise.all([usageQuery, chatQuery]);

  const usage = usageRows ?? [];
  const chats = chatRows ?? [];

  const totalRequests = usage.length;
  const chatRequests = chats.length;
  const errorCount = usage.filter((row) => (row.status_code ?? 0) >= 400).length;
  const successful = totalRequests - errorCount;
  const avgPerDay = Math.round(totalRequests / rangeDays);

  const dayKeys = getUsageDayKeys(rangeDays);

  const usageByDay = new Map(dayKeys.map((key) => [key, 0]));
  const chatByDay = new Map(dayKeys.map((key) => [key, 0]));

  for (const row of usage) {
    const key = String(row.created_at).slice(0, 10);
    if (usageByDay.has(key)) usageByDay.set(key, (usageByDay.get(key) ?? 0) + 1);
  }
  for (const row of chats) {
    const key = String(row.created_at).slice(0, 10);
    if (chatByDay.has(key)) chatByDay.set(key, (chatByDay.get(key) ?? 0) + 1);
  }

  const chartData = dayKeys.map((date) => ({
    date,
    total: usageByDay.get(date) ?? 0,
    chat: chatByDay.get(date) ?? 0,
  }));

  const hasData = totalRequests > 0 || chatRequests > 0;

  return (
    <DashboardShell>
      <PageHeader title={t("pages.usage.title")} description={t("pages.usage.description")} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm font-medium text-[color:var(--muted)]">
            {t("pages.usage.totalRequests")}
          </p>
          <p className="mt-2 text-4xl font-bold tracking-tight">{totalRequests.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm font-medium text-[color:var(--muted)]">
            {t("pages.usage.chatRequests")}
          </p>
          <p className="mt-2 text-4xl font-bold tracking-tight">{chatRequests.toLocaleString()}</p>
        </div>
      </div>

      <div className="mt-6">
        <UsageFilters keys={keys} range={String(rangeDays)} selectedKey={selectedKey} />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard label={t("pages.usage.successful")} value={successful.toLocaleString()} />
        <StatCard label={t("pages.usage.errors")} value={errorCount.toLocaleString()} />
        <StatCard label={t("pages.usage.avgPerDay")} value={avgPerDay.toLocaleString()} />
      </div>

      <div className="mt-6">
        {hasData ? (
          <UsageChart data={chartData} />
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-card px-5 py-14 text-center">
            <p className="font-medium">{t("pages.usage.empty")}</p>
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-[color:var(--muted)]">{t("pages.usage.timezoneNote")}</p>
    </DashboardShell>
  );
}
