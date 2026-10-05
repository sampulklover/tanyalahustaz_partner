import { computeChargeCents, getUsdMyrRate } from "@/lib/billing";
import { getMarkupPercent } from "@/lib/billing-settings";
import { loadChatHistory } from "@/lib/chat-history";
import { maybeSendLowBalanceAlert } from "@/lib/credit-alerts";
import { recordUsageCharge } from "@/lib/credit";
import { buildKnowledgeContext, dedupeSources, findRelevantKnowledge } from "@/lib/knowledge";
import { createTimer } from "@/lib/logger";
import { createSessionId, generateChatReply, type ChatUsage } from "@/lib/openrouter";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ChatResponse, KnowledgeSource } from "@/lib/types";

export type ExecuteChatInput = {
  message: string;
  sessionId?: string;
  category?: string;
  partnerId: string;
  apiKeyId?: string | null;
};

export type ExecuteChatResult =
  | { ok: true; data: ChatResponse }
  | { ok: false; error: string };

export function validateChatMessage(message: string) {
  const trimmed = message.trim();

  if (trimmed.length === 0) {
    return { ok: false as const, error: "Message cannot be empty." };
  }

  if (trimmed.length > 4000) {
    return { ok: false as const, error: "Message must be 4000 characters or fewer." };
  }

  return { ok: true as const, message: trimmed };
}

export type PreparedChatContext = {
  message: string;
  sessionId: string;
  knowledgeContext: string;
  history: Awaited<ReturnType<typeof loadChatHistory>>;
  sources: KnowledgeSource[];
};

export async function prepareChatContext(
  input: Pick<ExecuteChatInput, "message" | "sessionId" | "category" | "partnerId">,
): Promise<{ ok: true; data: PreparedChatContext } | { ok: false; error: string }> {
  const validation = validateChatMessage(input.message);

  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }

  try {
    const sessionId = createSessionId(input.sessionId);
    const timer = createTimer("prepare");
    const [retrievedKnowledge, history] = await Promise.all([
      findRelevantKnowledge(validation.message, input.category?.trim()),
      loadChatHistory({ partnerId: input.partnerId, sessionId }),
    ]);
    timer.mark("retrieval+history");
    timer.done({ sessionId });

    return {
      ok: true,
      data: {
        message: validation.message,
        sessionId,
        knowledgeContext: buildKnowledgeContext(retrievedKnowledge),
        history,
        sources: dedupeSources(retrievedKnowledge),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to prepare chat context.";
    return { ok: false, error: message };
  }
}

export async function persistChatExchange({
  partnerId,
  apiKeyId,
  sessionId,
  userMessage,
  assistantMessage,
  model,
  sources,
  usage,
}: {
  partnerId: string;
  apiKeyId?: string | null;
  sessionId: string;
  userMessage: string;
  assistantMessage: string;
  model: string;
  sources: KnowledgeSource[];
  usage?: ChatUsage | null;
}) {
  const admin = createAdminClient();

  // Price the AI usage: OpenRouter cost + markup, converted to MYR sen.
  const hasCost = Boolean(usage && usage.costUsd > 0);
  const markupPercent = hasCost ? await getMarkupPercent() : null;
  const usdMyrRate = hasCost ? getUsdMyrRate() : null;
  const chargedCents =
    hasCost && markupPercent !== null && usdMyrRate !== null
      ? computeChargeCents(usage!.costUsd, markupPercent, usdMyrRate)
      : 0;

  const { data, error } = await admin
    .from("partner_chat_logs")
    .insert({
      partner_id: partnerId,
      api_key_id: apiKeyId ?? null,
      session_id: sessionId,
      user_message: userMessage,
      assistant_message: assistantMessage,
      model,
      sources,
      prompt_tokens: usage?.promptTokens ?? null,
      completion_tokens: usage?.completionTokens ?? null,
      total_tokens: usage?.totalTokens ?? null,
      cost_usd: hasCost ? usage!.costUsd : null,
      usd_myr_rate: usdMyrRate,
      markup_percent: markupPercent,
      charged_cents: chargedCents,
    })
    .select("id")
    .single();

  let logId = data?.id ?? null;

  if (error) {
    // Fallback for environments where the billing migration has not run yet.
    const { data: fallback } = await admin
      .from("partner_chat_logs")
      .insert({
        partner_id: partnerId,
        api_key_id: apiKeyId ?? null,
        session_id: sessionId,
        user_message: userMessage,
        assistant_message: assistantMessage,
        model,
        sources,
      })
      .select("id")
      .single();
    logId = fallback?.id ?? null;
  }

  if (chargedCents > 0 && logId) {
    await recordUsageCharge({ userId: partnerId, chargedCents, logId });
    // Tell the partner when their balance drops to their chosen threshold.
    await maybeSendLowBalanceAlert(partnerId);
  }
}

export async function executeChat(input: ExecuteChatInput): Promise<ExecuteChatResult> {
  const prepared = await prepareChatContext(input);

  if (!prepared.ok) {
    return { ok: false, error: prepared.error };
  }

  try {
    const { message, sessionId, knowledgeContext, history, sources } = prepared.data;
    const timer = createTimer("chat");
    const { reply, model, usage } = await generateChatReply({
      userMessage: message,
      knowledgeContext,
      history,
      partnerId: input.partnerId,
    });
    timer.mark("llm");
    timer.done({ sessionId, model });

    await persistChatExchange({
      partnerId: input.partnerId,
      apiKeyId: input.apiKeyId,
      sessionId,
      userMessage: message,
      assistantMessage: reply,
      model,
      sources,
      usage,
    });

    return {
      ok: true,
      data: {
        reply,
        session_id: sessionId,
        sources,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate AI response.";
    return { ok: false, error: message };
  }
}
