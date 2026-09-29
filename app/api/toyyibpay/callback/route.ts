import { logError } from "@/lib/logger";
import { confirmToyyibPayBill } from "@/lib/toyyibpay-payments";
import { isToyyibPayConfigured } from "@/lib/toyyibpay";

export const runtime = "nodejs";

async function readBillCode(request: Request): Promise<string | null> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as { billcode?: unknown } | null;
    return typeof body?.billcode === "string" ? body.billcode : null;
  }

  const form = await request.formData().catch(() => null);
  const value = form?.get("billcode");
  return typeof value === "string" && value ? value : null;
}

export async function POST(request: Request) {
  if (!isToyyibPayConfigured()) {
    return new Response("ToyyibPay is not configured", { status: 503 });
  }

  const billCode = await readBillCode(request);

  if (!billCode) {
    return new Response("Missing billcode", { status: 400 });
  }

  try {
    await confirmToyyibPayBill(billCode);
  } catch (error) {
    logError("ToyyibPay callback failed", error, { billCode });
    return new Response("Failed to process callback", { status: 500 });
  }

  return Response.json({ received: true });
}
