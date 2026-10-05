import { authenticateApiRequest, recordApiUsage } from "@/lib/api-auth";
import { getCachedAnswer, storeCachedAnswer } from "@/lib/answer-cache";
import { resolveRequestId } from "@/lib/api/errors";
import { persistChatExchange, prepareChatContext } from "@/lib/chat";
import type { ChatUsage } from "@/lib/openrouter";
import {
  getActionTranslations,
  translateChatError,
  translateRateLimitError,
} from "@/lib/i18n/actions";
import { streamChatReply } from "@/lib/openrouter";
import { createPlaygroundSseStream } from "@/lib/playground-stream";
import { checkApiKeyRateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

type PlaygroundChatBody = {
  message?: unknown;
  session_id?: unknown;
  category?: unknown;
};

/**
 * Streaming chat for the "Try it live" playground. Unlike the dashboard-only
 * version, this authenticates with the user's own API key so what they test is
 * exactly what their product will call.
 */
export async function POST(request: Request) {
  const t = await getActionTranslations();

  const auth = await authenticateApiRequest(request);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  const context = auth.context;

  const rateLimit = await checkApiKeyRateLimit(context.apiKeyId, "chat");
  if (!rateLimit.ok) {
    return Response.json(
      {
        error: translateRateLimitError(t, rateLimit.error, {
          perMinute: Number(process.env.RATE_LIMIT_CHAT_PER_MINUTE ?? 20),
          perDay: Number(process.env.RATE_LIMIT_CHAT_PER_DAY ?? 500),
        }),
      },
      { status: 429 },
    );
  }

  let body: PlaygroundChatBody;

  try {
    body = (await request.json()) as PlaygroundChatBody;
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message : "";
  const sessionId =
    typeof body.session_id === "string" && body.session_id.trim()
      ? body.session_id.trim()
      : undefined;
  const category =
    typeof body.category === "string" && body.category.trim() && body.category !== "all"
      ? body.category.trim()
      : undefined;

  const prepared = await prepareChatContext({
    message,
    sessionId,
    category,
    partnerId: context.userId,
  });

  if (!prepared.ok) {
    return Response.json({ error: translateChatError(t, prepared.error) }, { status: 400 });
  }

  const { message: userMessage, sessionId: resolvedSessionId, knowledgeContext, history, sources } =
    prepared.data;

  const stream = createPlaygroundSseStream(async (send) => {
    send({ type: "meta", session_id: resolvedSessionId, sources });

    // First message of a session: try a cached answer before calling the model.
    // Follow-ups depend on prior turns, so they are never served from cache.
    if (history.length === 0) {
      const cached = await getCachedAnswer({
        question: userMessage,
        partnerId: context.userId,
      });

      if (cached && cached.answer) {
        send({ type: "meta", session_id: resolvedSessionId, sources: cached.sources });
        send({ type: "text", content: cached.answer });
        // A cache hit costs the partner nothing, so nothing is billed here.
        send({ type: "done" });
        return;
      }
    }

    let usage: ChatUsage | null = null;

    const { model, stream: tokenStream } = await streamChatReply({
      userMessage,
      knowledgeContext,
      history,
      signal: request.signal,
      partnerId: context.userId,
      onUsage: (value) => {
        usage = value;
      },
    });

    const reader = tokenStream.getReader();
    let reply = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        reply += value;
        send({ type: "text", content: value });
      }
    } finally {
      reader.releaseLock();
    }

    const trimmedReply = reply.trim();
    if (!trimmedReply) {
      throw new Error("OpenRouter returned an empty response.");
    }

    await persistChatExchange({
      partnerId: context.userId,
      apiKeyId: context.apiKeyId,
      sessionId: resolvedSessionId,
      userMessage,
      assistantMessage: trimmedReply,
      model,
      sources,
      usage,
    });

    // Cache first-turn answers only, so the next identical question is instant.
    if (history.length === 0) {
      void storeCachedAnswer({
        question: userMessage,
        partnerId: context.userId,
        category,
        answer: trimmedReply,
        sources,
      });
    }

    send({ type: "done" });
  });

  void recordApiUsage(
    { ...context, requestId: resolveRequestId(request) },
    request,
    200,
  );

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
