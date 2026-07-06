import { ApiKeyManager } from "@/components/api-key-manager";
import { createClient } from "@/lib/supabase/server";
import type { ApiKey } from "@/lib/types";

export const metadata = { title: "API Keys" };

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

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-bold tracking-tight">API Keys</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Create and revoke keys used to authenticate API requests.
        </p>
        <div className="mt-10">
          <ApiKeyManager keys={(keys ?? []) as ApiKey[]} />
        </div>
      </main>
  );
}
