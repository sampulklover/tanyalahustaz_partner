import type { AuthenticatedApiContext } from "@/lib/types";
import { extractApiKeyFromRequest, hashApiKey } from "@/lib/api-keys";
import { logError } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";

export async function authenticateApiRequest(
  request: Request,
): Promise<
  | { ok: true; context: AuthenticatedApiContext }
  | { ok: false; status: number; error: string }
> {
  const rawKey = extractApiKeyFromRequest(request);

  if (!rawKey) {
    return {
      ok: false,
      status: 401,
      error: "Missing API key. Pass Authorization: Bearer <key> or X-API-Key header.",
    };
  }

  if (!rawKey.startsWith("tlh_live_")) {
    return { ok: false, status: 401, error: "Invalid API key format." };
  }

  const keyHash = hashApiKey(rawKey);
  const admin = createAdminClient();

  const { data: apiKey, error } = await admin
    .from("api_keys")
    .select("id, user_id, name, revoked_at")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (error || !apiKey) {
    return { ok: false, status: 401, error: "Invalid API key." };
  }

  if (apiKey.revoked_at) {
    return { ok: false, status: 401, error: "API key has been revoked." };
  }

  return {
    ok: true,
    context: {
      apiKeyId: apiKey.id,
      userId: apiKey.user_id,
      keyName: apiKey.name,
    },
  };
}

export async function recordApiUsage(
  context: AuthenticatedApiContext,
  request: Request,
  statusCode: number,
) {
  try {
    const admin = createAdminClient();
    const url = new URL(request.url);

    await Promise.all([
      admin.from("api_usage").insert({
        api_key_id: context.apiKeyId,
        endpoint: url.pathname,
        method: request.method,
        status_code: statusCode,
      }),
      admin
        .from("api_keys")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", context.apiKeyId),
    ]);
  } catch (error) {
    logError("Failed to record API usage", error, {
      apiKeyId: context.apiKeyId,
      endpoint: new URL(request.url).pathname,
    });
  }
}
