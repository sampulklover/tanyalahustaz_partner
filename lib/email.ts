import { Resend } from "resend";
import { logError } from "@/lib/logger";

/**
 * Transactional email via Resend. Optional: when RESEND_API_KEY is not set the
 * app keeps working and sends are skipped, so local dev needs no email setup.
 */

let client: Resend | null = null;

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  client ??= new Resend(apiKey);
  return client;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

function getFromAddress(): string {
  return process.env.EMAIL_FROM ?? "Tanyalah Ustaz <noreply@tanyalahustaz.com>";
}

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

/** Returns true when Resend accepted the message. Never throws. */
export async function sendEmail({ to, subject, html, text }: SendEmailInput): Promise<boolean> {
  const resend = getResend();

  if (!resend) {
    return false;
  }

  try {
    const { error } = await resend.emails.send({
      from: getFromAddress(),
      to,
      subject,
      html,
      text,
    });

    if (error) {
      logError("Resend rejected an email", error, { to, subject });
      return false;
    }

    return true;
  } catch (error) {
    logError("Failed to send email", error, { to, subject });
    return false;
  }
}
