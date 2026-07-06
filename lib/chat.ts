import { loadChatHistory } from "@/lib/chat-history";
import {
  buildKnowledgeContext,
  dedupeSources,
  findRelevantKnowledge,
} from "@/lib/knowledge";
import { createSessionId, generateChatReply } from "@/lib/openrouter";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ChatResponse } from "@/lib/types";

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

export async function executeChat(input: ExecuteChatInput): Promise<ExecuteChatResult> {
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

    const knowledgeContext = buildKnowledgeContext(retrievedKnowledge);
    const { reply, model } = await generateChatReply({
      userMessage: validation.message,
      knowledgeContext,
      history,
    });

    const sources = dedupeSources(retrievedKnowledge);
    const admin = createAdminClient();

    await admin.from("partner_chat_logs").insert({
      partner_id: input.partnerId,
      api_key_id: input.apiKeyId ?? null,
      session_id: sessionId,
      user_message: validation.message,
      assistant_message: reply,
      model,
      sources,
    });

    return {
      ok: true,
      data: {
        reply,
        session_id: sessionId,
        model,
        sources,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate AI response.";
    return { ok: false, error: message };
  }
}
