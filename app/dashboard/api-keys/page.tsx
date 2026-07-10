import Link from "next/link";
import { ApiKeyManager } from "@/components/api-key-manager";
import { ApiKeyVerifier } from "@/components/api-key-verifier";
import { DashboardPage as DashboardShell } from "@/components/dashboard/page";
import { PageHeader } from "@/components/dashboard/page-header";
import { createClient } from "@/lib/supabase/server";
import type { ApiKey } from "@/lib/types";
import { getTranslations } from "@/lib/i18n/server";

export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t("pages.apiKeys.title") };
}

export default async function ApiKeysPage() {
  const t = await getTranslations();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { data: keys } = await supabase
    .from("api_keys")
    .select("id, user_id, name, key_prefix, last_used_at, revoked_at, created_at")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  const activeKeys = (keys ?? []).filter((key) => !key.revoked_at);

  return (
    <DashboardShell>
      <PageHeader
        title={t("pages.apiKeys.title")}
        description={t("pages.apiKeys.description")}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/docs/endpoints"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold transition hover:bg-background-subtle"
            >
              {t("common.apiReferenceLink")} ↗
            </Link>
            <Link
              href="/status"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold transition hover:bg-background-subtle"
            >
              {t("common.systemStatusLink")} ↗
            </Link>
          </div>
        }
      />

      <ApiKeyManager keys={(keys ?? []) as ApiKey[]} />

      {activeKeys.length > 0 && <div className="mt-6"><ApiKeyVerifier baseUrl={baseUrl} /></div>}
    </DashboardShell>
  );
}
