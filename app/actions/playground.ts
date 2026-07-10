"use server";

import { loadPlaygroundSessionMessages, type PlaygroundSessionMessage } from "@/lib/chat-history";
import { executeChat } from "@/lib/chat";
import {
  getActionTranslations,
  translateChatError,
  translateRateLimitError,
} from "@/lib/i18n/actions";
import { checkPlaygroundRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import type { ChatResponse } from "@/lib/types";

export type PlaygroundResult =
  | { ok: true; data: ChatResponse }
  | { ok: false; error: string };

export type PlaygroundHistoryResult =
  | { ok: true; data: { sessionId: string; messages: PlaygroundSessionMessage[] } }
  | { ok: false; error: string };

export async function loadPlaygroundHistory(sessionId: string): Promise<PlaygroundHistoryResult> {
  const t = await getActionTranslations();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: t("actionErrors.notSignedIn") };
  }

  const trimmed = sessionId.trim();
  if (!trimmed) {
    return { ok: true, data: { sessionId: "", messages: [] } };
  }

  const messages = await loadPlaygroundSessionMessages({
    partnerId: user.id,
    sessionId: trimmed,
  });

  return {
    ok: true,
    data: {
      sessionId: messages.length > 0 ? trimmed : "",
      messages,
    },
  };
}

export async function sendPlaygroundMessage(formData: FormData): Promise<PlaygroundResult> {
  const t = await getActionTranslations();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: t("actionErrors.notSignedIn") };
  }

  const rateLimit = await checkPlaygroundRateLimit(user.id);
  if (!rateLimit.ok) {
    return {
      ok: false,
      error: translateRateLimitError(t, rateLimit.error, {
        perMinute: Number(process.env.RATE_LIMIT_PLAYGROUND_PER_MINUTE ?? 10),
        perDay: Number(process.env.RATE_LIMIT_PLAYGROUND_PER_DAY ?? 50),
      }),
    };
  }

  const message = String(formData.get("message") ?? "");
  const sessionId = String(formData.get("session_id") ?? "").trim() || undefined;
  const category = String(formData.get("category") ?? "").trim() || undefined;

  const result = await executeChat({
    message,
    sessionId,
    category: category === "all" ? undefined : category,
    partnerId: user.id,
    apiKeyId: null,
  });

  if (!result.ok) {
    return { ok: false, error: translateChatError(t, result.error) };
  }

  return result;
}
