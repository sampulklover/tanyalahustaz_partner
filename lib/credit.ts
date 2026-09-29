import { createAdminClient } from "@/lib/supabase/admin";

export type CreditReason = "topup" | "usage" | "refund" | "adjustment";

/** Current credit balance in MYR cents (sum of the ledger). */
export async function getCreditBalanceCents(userId: string): Promise<number> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("get_credit_balance", { p_user_id: userId });

    if (!error && typeof data === "number") {
      return data;
    }
  } catch {
    // Fall through to the manual sum below.
  }

  // Fallback when the RPC migration has not been applied yet.
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("credit_ledger").select("delta_cents").eq("user_id", userId);

    return (data ?? []).reduce((sum, row) => sum + (Number(row.delta_cents) || 0), 0);
  } catch {
    return 0;
  }
}

/**
 * Credit a partner after a confirmed top-up.
 * Idempotent: the unique (reference, reason='topup') index drops retries.
 */
export async function recordTopUpCredit({
  userId,
  amountCents,
  billCode,
  paymentMethod,
}: {
  userId: string;
  amountCents: number;
  billCode: string;
  paymentMethod?: string | null;
}): Promise<void> {
  if (amountCents <= 0) return;

  const admin = createAdminClient();
  const { error } = await admin.from("credit_ledger").insert({
    user_id: userId,
    delta_cents: amountCents,
    reason: "topup",
    reference: billCode,
    metadata: paymentMethod ? { payment_method: paymentMethod } : {},
  });

  // 23505 = duplicate key: this bill was already credited.
  if (error && error.code !== "23505") {
    throw new Error(error.message);
  }
}

/** Charge a partner for one AI request. */
export async function recordUsageCharge({
  userId,
  chargedCents,
  logId,
}: {
  userId: string;
  chargedCents: number;
  logId: string;
}): Promise<void> {
  if (chargedCents <= 0) return;

  try {
    const admin = createAdminClient();
    await admin.from("credit_ledger").insert({
      user_id: userId,
      delta_cents: -chargedCents,
      reason: "usage",
      reference: logId,
    });
  } catch {
    // Never let billing bookkeeping break a chat response.
  }
}
