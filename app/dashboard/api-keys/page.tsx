import Link from "next/link";
import { ApiKeyManager } from "@/components/api-key-manager";
import { ApiKeyVerifier } from "@/components/api-key-verifier";
import { DashboardPage as DashboardShell } from "@/components/dashboard/page";
import { PageHeader } from "@/components/dashboard/page-header";
import { createClient } from "@/lib/supabase/server";
import type { ApiKey } from "@/lib/types";

export const metadata = { title: "API Keys" };

export default async function ApiKeysPage() {
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
        title="API keys"
        description="Create and manage keys used to authenticate requests to the API. Keys are shown once at creation — store them securely."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/docs/endpoints"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold transition hover:bg-background-subtle"
            >
              API reference ↗
            </Link>
            <Link
              href="/status"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold transition hover:bg-background-subtle"
            >
              System status ↗
            </Link>
          </div>
        }
      />

      <ApiKeyManager keys={(keys ?? []) as ApiKey[]} />

      {activeKeys.length > 0 && <div className="mt-6"><ApiKeyVerifier baseUrl={baseUrl} /></div>}
    </DashboardShell>
  );
}
