import { redirect } from "next/navigation";
import { logError } from "@/lib/logger";
import { confirmToyyibPayBill } from "@/lib/toyyibpay-payments";
import { isToyyibPayConfigured } from "@/lib/toyyibpay";

export const runtime = "nodejs";

/**
 * Payer return URL. We never trust the query string alone — the bill is
 * re-checked against the ToyyibPay API before crediting the account.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? url.origin;
  const billCode = url.searchParams.get("billcode");
  const statusId = url.searchParams.get("status_id");

  let outcome = statusId === "3" ? "cancelled" : "pending";

  if (billCode && isToyyibPayConfigured()) {
    try {
      const result = await confirmToyyibPayBill(billCode);
      if (result.outcome === "paid") outcome = "success";
      else if (result.outcome === "failed") outcome = "cancelled";
    } catch (error) {
      logError("ToyyibPay return verification failed", error, { billCode });
    }
  }

  redirect(`${appUrl}/dashboard/top-up?status=${outcome}`);
}
