import { loadChatHistory } from "@/lib/chat-history";
import {
  buildKnowledgeContext,
  dedupeSources,
  findRelevantKnowledge,
} from "@/lib/knowledge";
import { createSessionId, generateChatReply } from "@/lib/openrouter";
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

  if (trimmed.length < 3) {
    return { ok: false as const, error: "Message must be at least 3 characters." };
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
    const [retrievedKnowledge, history] = await Promise.all([
      findRelevantKnowledge(validation.message, input.category?.trim()),
      loadChatHistory({ partnerId: input.partnerId, sessionId }),
    ]);

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
}: {
  partnerId: string;
  apiKeyId?: string | null;
  sessionId: string;
  userMessage: string;
  assistantMessage: string;
  model: string;
  sources: KnowledgeSource[];
}) {
  const admin = createAdminClient();

  await admin.from("partner_chat_logs").insert({
    partner_id: partnerId,
    api_key_id: apiKeyId ?? null,
    session_id: sessionId,
    user_message: userMessage,
    assistant_message: assistantMessage,
    model,
    sources,
  });
}

export async function executeChat(input: ExecuteChatInput): Promise<ExecuteChatResult> {
  const prepared = await prepareChatContext(input);

  if (!prepared.ok) {
    return { ok: false, error: prepared.error };
  }

  try {
    const { message, sessionId, knowledgeContext, history, sources } = prepared.data;
    const { reply, model } = await generateChatReply({
      userMessage: message,
      knowledgeContext,
      history,
    });

    await persistChatExchange({
      partnerId: input.partnerId,
      apiKeyId: input.apiKeyId,
      sessionId,
      userMessage: message,
      assistantMessage: reply,
      model,
      sources,
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
