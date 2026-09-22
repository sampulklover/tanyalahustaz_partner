import { ApiKeyManager } from "@/components/api-key-manager";
import { DashboardPage as DashboardShell } from "@/components/dashboard/page";
import { createClient } from "@/lib/supabase/server";
import type { ApiKey } from "@/lib/types";
import { getTranslations } from "@/lib/i18n/server";
import { getNowMs } from "@/lib/usage";

export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t("pages.apiKeys.title") };
}

export default async function ApiKeysPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: keys } = await supabase
    .from("api_keys")
    .select("id, user_id, name, key_prefix, last_used_at, revoked_at, created_at")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  const keyRows = (keys ?? []) as ApiKey[];

  const counts = await Promise.all(
    keyRows.map((key) =>
      supabase
        .from("api_usage")
        .select("*", { count: "exact", head: true })
        .eq("api_key_id", key.id),
    ),
  );

  const usageByKey: Record<string, number> = {};
  keyRows.forEach((key, index) => {
    usageByKey[key.id] = counts[index].count ?? 0;
  });

  return (
    <DashboardShell>
      <ApiKeyManager keys={keyRows} usageByKey={usageByKey} now={getNowMs()} />
    </DashboardShell>
  );
}
