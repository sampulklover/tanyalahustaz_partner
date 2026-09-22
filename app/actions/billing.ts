"use server";

import { redirect } from "next/navigation";
import { getActionTranslations } from "@/lib/i18n/actions";
import { MAX_TOPUP_CENTS, MIN_TOPUP_CENTS } from "@/lib/billing";
import { getStripe, getStripePaymentMethods, isStripeConfigured } from "@/lib/stripe";
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

  if (!isStripeConfigured()) {
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
  const stripe = getStripe();

  let url: string | null = null;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: getStripePaymentMethods(),
      client_reference_id: user.id,
      metadata: { user_id: user.id, amount_cents: String(amountCents) },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "myr",
            unit_amount: amountCents,
            product_data: { name: "Tanyalah Ustaz API credit" },
          },
        },
      ],
      success_url: `${appUrl}/dashboard/top-up?status=success`,
      cancel_url: `${appUrl}/dashboard/top-up?status=cancelled`,
    });
    url = session.url;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : t("actionErrors.paymentFailed"),
    };
  }

  if (!url) {
    return { error: t("actionErrors.paymentFailed") };
  }

  redirect(url);
}
