import { DashboardPage as DashboardShell } from "@/components/dashboard/page";
import { PageHeader } from "@/components/dashboard/page-header";
import { UsageView, type UsageKeyStats } from "@/components/dashboard/usage-view";
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
  const dayKeys = getUsageDayKeys(rangeDays);
  const dayIndex = new Map(dayKeys.map((day, index) => [day, index]));

  const [{ data: keysData }, { data: usageRows }] = await Promise.all([
    supabase
      .from("api_keys")
      .select("id, name, revoked_at")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("api_usage")
      .select("created_at, status_code, api_key_id")
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .limit(20000),
  ]);

  const keys = (keysData ?? []).map((key) => ({
    id: key.id as string,
    name: key.name as string,
  }));

  const emptyStats = (): UsageKeyStats => ({
    perDay: dayKeys.map(() => 0),
    success: 0,
    error: 0,
  });

  const byKey: Record<string, UsageKeyStats> = { all: emptyStats() };

  for (const row of usageRows ?? []) {
    const keyId = (row.api_key_id as string | null) ?? "unknown";
    if (!byKey[keyId]) byKey[keyId] = emptyStats();

    const index = dayIndex.get(String(row.created_at).slice(0, 10));
    if (index === undefined) continue;

    const isError = (row.status_code ?? 0) >= 400;

    byKey[keyId].perDay[index] += 1;
    byKey.all.perDay[index] += 1;

    if (isError) {
      byKey[keyId].error += 1;
      byKey.all.error += 1;
    } else {
      byKey[keyId].success += 1;
      byKey.all.success += 1;
    }
  }

  return (
    <DashboardShell>
      <PageHeader title={t("pages.usage.title")} description={t("pages.usage.description")} />

      <UsageView
        keys={keys}
        days={dayKeys}
        rangeDays={rangeDays}
        initialKey={selectedKey}
        byKey={byKey}
      />

      <p className="mt-4 text-xs text-[color:var(--muted)]">{t("pages.usage.timezoneNote")}</p>
    </DashboardShell>
  );
}
