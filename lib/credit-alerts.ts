import { formatMyr } from "@/lib/billing";
import { getCreditBalanceCents } from "@/lib/credit";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { logError } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";

/** Only one low-balance email per partner per day while the balance stays low. */
const ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export type LowBalanceSettings = {
  email: string | null;
  thresholdCents: number | null;
  alertedAt: string | null;
};

export async function getLowBalanceSettings(userId: string): Promise<LowBalanceSettings> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("profiles")
      .select("email, low_balance_threshold_cents, low_balance_alerted_at")
      .eq("id", userId)
      .maybeSingle();

    const rawThreshold = Number(data?.low_balance_threshold_cents);

    return {
      email: typeof data?.email === "string" ? data.email : null,
      thresholdCents: Number.isFinite(rawThreshold) ? rawThreshold : null,
      alertedAt: typeof data?.low_balance_alerted_at === "string" ? data.low_balance_alerted_at : null,
    };
  } catch {
    return { email: null, thresholdCents: null, alertedAt: null };
  }
}

/** Set (or clear, with null) the partner's low-balance threshold. */
export async function saveLowBalanceThreshold(
  userId: string,
  thresholdCents: number | null,
): Promise<void> {
  const value =
    thresholdCents === null || thresholdCents <= 0 ? null : Math.round(thresholdCents);

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ low_balance_threshold_cents: value })
    .eq("id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

function buildAlertEmail({
  balanceCents,
  thresholdCents,
  appUrl,
}: {
  balanceCents: number;
  thresholdCents: number;
  appUrl: string;
}) {
  const balance = formatMyr(balanceCents, { decimals: true });
  const threshold = formatMyr(thresholdCents, { decimals: true });
  const topUpUrl = `${appUrl}/dashboard/top-up`;

  const text = [
    "Your Tanyalah Ustaz API credit is running low.",
    "",
    `Current balance: ${balance}`,
    `Your alert threshold: ${threshold}`,
    "",
    `Top up to keep your integration running: ${topUpUrl}`,
    "",
    "You are receiving this because you set a low-credit alert for your account.",
  ].join("\n");

  const html = `
    <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;color:#0a0f0d">
      <h1 style="font-size:20px;margin:0 0 12px">Your API credit is running low</h1>
      <p style="margin:0 0 16px;color:#4b5563">
        Your Tanyalah Ustaz API balance has dropped to or below the threshold you set.
        Top up to avoid interruptions.
      </p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 20px;font-size:14px">
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #e6e9e8;color:#6b7280">Current balance</td>
          <td style="padding:10px 0;border-bottom:1px solid #e6e9e8;text-align:right;font-weight:600">${balance}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#6b7280">Alert threshold</td>
          <td style="padding:10px 0;text-align:right;font-weight:600">${threshold}</td>
        </tr>
      </table>
      <a href="${topUpUrl}"
         style="display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600">
        Top up credit
      </a>
      <p style="margin:20px 0 0;font-size:12px;color:#9ca3af">
        You are receiving this because you set a low-credit alert for your account.
      </p>
    </div>
  `;

  return { subject: "Your Tanyalah Ustaz API credit is running low", text, html };
}

/**
 * Send a low-balance email when the partner is at/below their threshold.
 * Idempotent-ish: a 24h cooldown prevents repeated messages while low.
 * Never throws — billing alerts must not break a chat response.
 */
export async function maybeSendLowBalanceAlert(userId: string): Promise<boolean> {
  try {
    if (!isEmailConfigured()) {
      return false;
    }

    const settings = await getLowBalanceSettings(userId);
    const threshold = settings.thresholdCents;

    if (!settings.email || !threshold || threshold <= 0) {
      return false;
    }

    const lastAlert = settings.alertedAt ? Date.parse(settings.alertedAt) : 0;

    if (Number.isFinite(lastAlert) && Date.now() - lastAlert < ALERT_COOLDOWN_MS) {
      return false;
    }

    const balanceCents = await getCreditBalanceCents(userId);

    if (balanceCents > threshold) {
      return false;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const { subject, text, html } = buildAlertEmail({ balanceCents, thresholdCents: threshold, appUrl });

    const sent = await sendEmail({ to: settings.email, subject, html, text });

    if (sent) {
      const admin = createAdminClient();
      await admin
        .from("profiles")
        .update({ low_balance_alerted_at: new Date().toISOString() })
        .eq("id", userId);
    }

    return sent;
  } catch (error) {
    logError("Low-balance alert check failed", error, { userId });
    return false;
  }
}

/** Send a one-off alert so partners can confirm their email works. */
export async function sendLowBalanceTestEmail(
  userId: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!isEmailConfigured()) {
    return { ok: false, error: "notConfigured" };
  }

  const settings = await getLowBalanceSettings(userId);

  if (!settings.email) {
    return { ok: false, error: "noEmail" };
  }

  const balanceCents = await getCreditBalanceCents(userId);
  const thresholdCents = settings.thresholdCents ?? 0;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { subject, text, html } = buildAlertEmail({ balanceCents, thresholdCents, appUrl });

  const sent = await sendEmail({
    to: settings.email,
    subject: `[Test] ${subject}`,
    html,
    text,
  });

  return sent ? { ok: true } : { ok: false, error: "sendFailed" };
}
