"use server";

import { redirect } from "next/navigation";
import { getActionTranslations } from "@/lib/i18n/actions";
import { MAX_TOPUP_CENTS, MIN_TOPUP_CENTS } from "@/lib/billing";
import { isToyyibPayConfigured } from "@/lib/toyyibpay";
import { startToyyibPayTopUp } from "@/lib/toyyibpay-payments";
import { createClient } from "@/lib/supabase/server";

export async function createTopUpCheckout(formData: FormData) {
  const t = await getActionTranslations();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: t("actionErrors.notSignedIn") };
  }

  if (!isToyyibPayConfigured()) {
    return { error: t("actionErrors.paymentsNotConfigured") };
  }

  const amountCents = Math.round(Number(formData.get("amount_cents")));
  if (
    !Number.isFinite(amountCents) ||
    amountCents < MIN_TOPUP_CENTS ||
    amountCents > MAX_TOPUP_CENTS
  ) {
    return { error: t("actionErrors.invalidAmount") };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, company_name")
    .eq("id", user.id)
    .maybeSingle();

  const email = user.email ?? profile?.email ?? "";
  const name = profile?.company_name?.trim() || email.split("@")[0] || "Customer";

  let paymentUrl: string | null = null;

  try {
    const bill = await startToyyibPayTopUp({
      userId: user.id,
      email,
      name,
      amountCents,
      appUrl,
    });
    paymentUrl = bill.paymentUrl;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : t("actionErrors.paymentFailed"),
    };
  }

  if (!paymentUrl) {
    return { error: t("actionErrors.paymentFailed") };
  }

  redirect(paymentUrl);
}
