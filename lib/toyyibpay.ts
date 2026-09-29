/**
 * ToyyibPay client (server-only).
 *
 * Docs: https://toyyibpay.com/apireference
 *
 * Flow: create a Bill, redirect the payer to its payment URL, then confirm the
 * result with `getBillTransactions` before crediting the account. The callback
 * payload itself is not signed, so the API check is the source of truth.
 */

const SANDBOX_URL = "https://dev.toyyibpay.com";
const PRODUCTION_URL = "https://toyyibpay.com";

export type ToyyibPayChannel = "0" | "1" | "2";

export type CreateBillInput = {
  name: string;
  description: string;
  amountCents: number;
  referenceNo: string;
  returnUrl: string;
  callbackUrl: string;
  payerName: string;
  payerEmail: string;
  payerPhone?: string;
};

export type ToyyibPayTransaction = {
  billpaymentStatus?: string;
  billpaymentAmount?: string;
  billpaymentInvoiceNo?: string;
  billpaymentChannel?: string;
  billExternalReferenceNo?: string;
  billpaymentDate?: string;
};

export function isToyyibPayConfigured() {
  return Boolean(process.env.TOYYIBPAY_SECRET_KEY && process.env.TOYYIBPAY_CATEGORY_CODE);
}

export function getToyyibPayBaseUrl() {
  const env = (process.env.TOYYIBPAY_ENV ?? "sandbox").toLowerCase();
  return env === "production" || env === "live" ? PRODUCTION_URL : SANDBOX_URL;
}

function getSecretKey() {
  const key = process.env.TOYYIBPAY_SECRET_KEY;

  if (!key) {
    throw new Error("TOYYIBPAY_SECRET_KEY is not configured.");
  }

  return key;
}

function getCategoryCode() {
  const code = process.env.TOYYIBPAY_CATEGORY_CODE;

  if (!code) {
    throw new Error("TOYYIBPAY_CATEGORY_CODE is not configured.");
  }

  return code;
}

function getPaymentChannel(): ToyyibPayChannel {
  const value = process.env.TOYYIBPAY_PAYMENT_CHANNEL?.trim();
  return value === "0" || value === "1" || value === "2" ? value : "2";
}

function getChargeToCustomer() {
  const value = process.env.TOYYIBPAY_CHARGE_TO_CUSTOMER?.trim();
  return value === "0" || value === "1" || value === "2" ? value : "0";
}

async function post(path: string, body: Record<string, string>) {
  const response = await fetch(`${getToyyibPayBaseUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`ToyyibPay request failed (${response.status}): ${text.slice(0, 300)}`);
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`ToyyibPay returned an unexpected response: ${text.slice(0, 300)}`);
  }
}

export async function createToyyibPayBill(
  input: CreateBillInput,
): Promise<{ billCode: string; paymentUrl: string }> {
  const payload = await post("/index.php/api/createBill", {
    userSecretKey: getSecretKey(),
    categoryCode: getCategoryCode(),
    billName: input.name.slice(0, 30),
    billDescription: input.description.slice(0, 100),
    billPriceSetting: "1",
    billPayorInfo: "1",
    billAmount: String(input.amountCents),
    billReturnUrl: input.returnUrl,
    billCallbackUrl: input.callbackUrl,
    billExternalReferenceNo: input.referenceNo,
    billTo: input.payerName,
    billEmail: input.payerEmail,
    billPhone: input.payerPhone ?? process.env.TOYYIBPAY_DEFAULT_PHONE ?? "0000000000",
    billPaymentChannel: getPaymentChannel(),
    billChargeToCustomer: getChargeToCustomer(),
  });

  const candidate = Array.isArray(payload) ? payload[0] : payload;
  const record =
    candidate && typeof candidate === "object" ? (candidate as Record<string, unknown>) : null;
  const billCode = record && typeof record.BillCode === "string" ? record.BillCode : null;

  if (!billCode) {
    const message =
      record && typeof record.msg === "string"
        ? record.msg
        : "ToyyibPay did not return a bill code.";
    throw new Error(message);
  }

  return {
    billCode,
    paymentUrl: `${getToyyibPayBaseUrl()}/${billCode}`,
  };
}

/**
 * Fetch transactions for a bill. Pass a status to filter:
 *   1 = success, 2 = pending, 3 = fail, 4 = pending.
 */
export async function getToyyibPayBillTransactions(
  billCode: string,
  status?: "1" | "2" | "3" | "4",
): Promise<ToyyibPayTransaction[]> {
  const body: Record<string, string> = {
    userSecretKey: getSecretKey(),
    billCode,
  };

  if (status) {
    body.billpaymentStatus = status;
  }

  const payload = await post("/index.php/api/getBillTransactions", body);

  if (Array.isArray(payload)) {
    return payload.filter(
      (entry): entry is ToyyibPayTransaction => Boolean(entry) && typeof entry === "object",
    );
  }

  if (payload && typeof payload === "object") {
    return [payload as ToyyibPayTransaction];
  }

  return [];
}

/** The most relevant transaction for a bill (successful one wins). */
export async function getToyyibPayBillTransaction(
  billCode: string,
): Promise<ToyyibPayTransaction | null> {
  const transactions = await getToyyibPayBillTransactions(billCode);

  return (
    transactions.find((tx) => tx.billpaymentStatus === "1") ?? transactions[0] ?? null
  );
}
