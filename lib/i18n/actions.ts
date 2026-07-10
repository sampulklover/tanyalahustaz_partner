import { getTranslations } from "@/lib/i18n/server";
import type { Translator } from "@/lib/i18n/translator";

export async function getActionTranslations() {
  return getTranslations();
}

const CHAT_ERROR_MAP: Record<string, string> = {
  "Message must be at least 3 characters.": "actionErrors.messageTooShort",
  "Message must be 4000 characters or fewer.": "actionErrors.messageTooLong",
  "Failed to generate AI response.": "actionErrors.aiResponseFailed",
};

export function translateChatError(t: Translator, error: string) {
  const key = CHAT_ERROR_MAP[error];
  return key ? t(key) : error;
}

export function translateRateLimitError(
  t: Translator,
  error: string,
  limits: { perMinute: number; perDay: number },
) {
  if (error.includes("per minute")) {
    return t("actionErrors.rateLimitMinute", { limit: limits.perMinute });
  }
  if (error.includes("per day")) {
    return t("actionErrors.rateLimitDay", { limit: limits.perDay });
  }
  return error;
}
