import { apiError, apiSuccess, parsePagination, withApiAuth } from "@/lib/api/handler";
import {
  buildKnowledgeContext,
  findRelevantKnowledge,
  toKnowledgeSource,
} from "@/lib/knowledge";
import { createSessionId, generateChatReply } from "@/lib/openrouter";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ChatRequestBody, KnowledgeArticle } from "@/lib/types";

export async function POST(request: Request) {
  return withApiAuth(request, async (req, context) => {
    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return apiError("Request body must be valid JSON.");
    }

    if (!body || typeof body !== "object") {
      return apiError("Request body must be a JSON object.");
    }

    const { message, session_id, category } = body as ChatRequestBody;

    if (typeof message !== "string" || message.trim().length < 3) {
      return apiError("Field 'message' is required and must be at least 3 characters.");
    }

    if (message.trim().length > 4000) {
      return apiError("Field 'message' must be 4000 characters or fewer.");
    }

    if (session_id !== undefined && typeof session_id !== "string") {
      return apiError("Field 'session_id' must be a string.");
    }

    if (category !== undefined && typeof category !== "string") {
      return apiError("Field 'category' must be a string.");
    }

    try {
      const articles = await findRelevantKnowledge(message.trim(), category?.trim());
      const knowledgeContext = buildKnowledgeContext(articles);
      const { reply, model } = await generateChatReply({
        userMessage: message.trim(),
        knowledgeContext,
      });

      const sessionId = createSessionId(session_id);
      const sources = articles.map(toKnowledgeSource);
      const admin = createAdminClient();

      await admin.from("partner_chat_logs").insert({
        partner_id: context.userId,
        api_key_id: context.apiKeyId,
        session_id: sessionId,
        user_message: message.trim(),
        assistant_message: reply,
        model,
        sources,
      });

      return apiSuccess({
        reply,
        session_id: sessionId,
        model,
        sources,
      });
    } catch (error) {
      const message_text =
        error instanceof Error ? error.message : "Failed to generate AI response.";
      return apiError(message_text, 502);
    }
  });
}
