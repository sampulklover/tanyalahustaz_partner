import { persistChatExchange, prepareChatContext } from "@/lib/chat";
import {
  getActionTranslations,
  translateChatError,
  translateRateLimitError,
} from "@/lib/i18n/actions";
import { streamChatReply } from "@/lib/openrouter";
import { createPlaygroundSseStream } from "@/lib/playground-stream";
import { checkPlaygroundRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

type PlaygroundChatBody = {
  message?: unknown;
  session_id?: unknown;
  category?: unknown;
};

export async function POST(request: Request) {
  const t = await getActionTranslations();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: t("actionErrors.notSignedIn") }, { status: 401 });
  }

  const rateLimit = await checkPlaygroundRateLimit(user.id);
  if (!rateLimit.ok) {
    return Response.json(
      {
        error: translateRateLimitError(t, rateLimit.error, {
          perMinute: Number(process.env.RATE_LIMIT_PLAYGROUND_PER_MINUTE ?? 10),
          perDay: Number(process.env.RATE_LIMIT_PLAYGROUND_PER_DAY ?? 50),
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
    partnerId: user.id,
  });

  if (!prepared.ok) {
    return Response.json({ error: translateChatError(t, prepared.error) }, { status: 400 });
  }

  const { message: userMessage, sessionId: resolvedSessionId, knowledgeContext, history, sources } =
    prepared.data;

  const stream = createPlaygroundSseStream(async (send) => {
    send({ type: "meta", session_id: resolvedSessionId, sources });

    const { model, stream: tokenStream } = await streamChatReply({
      userMessage,
      knowledgeContext,
      history,
      signal: request.signal,
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
      partnerId: user.id,
      apiKeyId: null,
      sessionId: resolvedSessionId,
      userMessage,
      assistantMessage: trimmedReply,
      model,
      sources,
    });

    send({ type: "done" });
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
