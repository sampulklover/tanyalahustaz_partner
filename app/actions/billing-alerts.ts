"use server";

import { revalidatePath } from "next/cache";
import { saveLowBalanceThreshold, sendLowBalanceTestEmail } from "@/lib/credit-alerts";
import { createClient } from "@/lib/supabase/server";

export type BillingAlertState = { error?: string; success?: string };

async function getUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function updateLowBalanceAlert(
  _prev: BillingAlertState,
  formData: FormData,
): Promise<BillingAlertState> {
  const userId = await getUserId();
  if (!userId) return { error: "notSignedIn" };

  const raw = String(formData.get("threshold") ?? "").trim();

  if (!raw) {
    await saveLowBalanceThreshold(userId, null);
    revalidatePath("/dashboard/billing");
    return { success: "disabled" };
  }

  const ringgit = Number(raw);

  if (!Number.isFinite(ringgit) || ringgit < 0) {
    return { error: "invalidAmount" };
  }

  await saveLowBalanceThreshold(userId, Math.round(ringgit * 100));
  revalidatePath("/dashboard/billing");
  return { success: "saved" };
}

export async function sendLowBalanceTest(): Promise<BillingAlertState> {
  const userId = await getUserId();
  if (!userId) return { error: "notSignedIn" };

  const result = await sendLowBalanceTestEmail(userId);

  return result.ok ? { success: "testSent" } : { error: result.error ?? "sendFailed" };
}
