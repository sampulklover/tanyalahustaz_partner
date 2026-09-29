import { randomUUID } from "crypto";
import { recordTopUpCredit } from "@/lib/credit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createToyyibPayBill, getToyyibPayBillTransaction } from "@/lib/toyyibpay";
import type { ToyyibPayTransaction } from "@/lib/toyyibpay";

export type TopUpOutcome = "paid" | "pending" | "failed" | "unknown";

/**
 * Create a ToyyibPay bill for a top-up and record it as pending.
 * Returns the hosted payment URL to redirect the payer to.
 */
export async function startToyyibPayTopUp({
  userId,
  email,
  name,
  amountCents,
  appUrl,
}: {
  userId: string;
  email: string;
  name: string;
  amountCents: number;
  appUrl: string;
}): Promise<{ billCode: string; paymentUrl: string }> {
  const reference = randomUUID();

  const { billCode, paymentUrl } = await createToyyibPayBill({
    name: "Tanyalah Ustaz API credit",
    description: "API credit top up",
    amountCents,
    referenceNo: reference,
    returnUrl: `${appUrl}/api/toyyibpay/return`,
    callbackUrl: `${appUrl}/api/toyyibpay/callback`,
    payerName: name,
    payerEmail: email,
  });

  const admin = createAdminClient();
  const { error } = await admin.from("billing_transactions").insert({
    user_id: userId,
    provider: "toyyibpay",
    provider_bill_code: billCode,
    provider_ref_no: reference,
    amount_cents: amountCents,
    currency: "myr",
    status: "pending",
  });

  if (error) {
    throw new Error(error.message);
  }

  return { billCode, paymentUrl };
}

/**
 * Mark a bill as failed when the payer cancels before paying.
 * Never downgrades a row that is already paid.
 */
export async function markToyyibPayBillCancelled(billCode: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("billing_transactions")
    .update({ status: "failed" })
    .eq("provider_bill_code", billCode)
    .eq("status", "pending");
}

/**
 * Confirm a bill's real status with ToyyibPay and, when successful, credit the
 * account. The callback payload is unsigned, so this API check is the source of
 * truth. Safe to call repeatedly (top-up crediting is idempotent).
 */
export async function confirmToyyibPayBill(billCode: string): Promise<{
  outcome: TopUpOutcome;
  amountCents: number;
}> {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("billing_transactions")
    .select("id, user_id, amount_cents, provider_ref_no")
    .eq("provider_bill_code", billCode)
    .maybeSingle();

  if (!row) {
    return { outcome: "unknown", amountCents: 0 };
  }

  let transaction: ToyyibPayTransaction | null;
  try {
    transaction = await getToyyibPayBillTransaction(billCode);
  } catch {
    return { outcome: "pending", amountCents: row.amount_cents };
  }

  const status = transaction?.billpaymentStatus;

  if (status === "1") {
    const paymentMethod = transaction?.billpaymentChannel ?? null;

    await admin
      .from("billing_transactions")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        payment_method: paymentMethod,
        provider_payment_id: transaction?.billpaymentInvoiceNo ?? null,
        provider_ref_no: transaction?.billExternalReferenceNo ?? row.provider_ref_no,
      })
      .eq("id", row.id);

    await recordTopUpCredit({
      userId: row.user_id,
      amountCents: row.amount_cents,
      billCode,
      paymentMethod,
    });

    return { outcome: "paid", amountCents: row.amount_cents };
  }

  if (status === "3") {
    await admin.from("billing_transactions").update({ status: "failed" }).eq("id", row.id);
    return { outcome: "failed", amountCents: row.amount_cents };
  }

  return { outcome: "pending", amountCents: row.amount_cents };
}
