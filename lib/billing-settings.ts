import {
  DEFAULT_MARKUP_PERCENT,
  normalizeMarkupPercent,
} from "@/lib/billing";
import { createAdminClient } from "@/lib/supabase/admin";

const CACHE_TTL_MS = 30_000;
let cached: { at: number; markupPercent: number } | null = null;

export function clearBillingSettingsCache() {
  cached = null;
}

/** The admin-configured markup applied to AI usage cost. */
export async function getMarkupPercent(): Promise<number> {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.markupPercent;
  }

  let markupPercent = DEFAULT_MARKUP_PERCENT;

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("billing_settings")
      .select("markup_percent")
      .eq("id", "default")
      .maybeSingle();

    const stored = Number(data?.markup_percent);
    if (Number.isFinite(stored)) {
      markupPercent = normalizeMarkupPercent(stored);
    }
  } catch {
    // Table missing or DB unavailable — fall back to the minimum markup.
  }

  cached = { at: Date.now(), markupPercent };
  return markupPercent;
}

/** Settings plus metadata for the admin editor. */
export async function getBillingSettings(): Promise<{
  markupPercent: number;
  updatedAt: string | null;
}> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("billing_settings")
    .select("markup_percent, updated_at")
    .eq("id", "default")
    .maybeSingle();

  const stored = Number(data?.markup_percent);

  return {
    markupPercent: Number.isFinite(stored)
      ? normalizeMarkupPercent(stored)
      : DEFAULT_MARKUP_PERCENT,
    updatedAt: typeof data?.updated_at === "string" ? data.updated_at : null,
  };
}

export async function saveMarkupPercent(value: number, userId: string | null): Promise<void> {
  const markupPercent = normalizeMarkupPercent(value);

  const admin = createAdminClient();
  const { error } = await admin.from("billing_settings").upsert(
    {
      id: "default",
      markup_percent: markupPercent,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) {
    throw new Error(error.message);
  }

  clearBillingSettingsCache();
}
