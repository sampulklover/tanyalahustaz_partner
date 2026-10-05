import { authenticateApiRequest, recordApiUsage } from "@/lib/api-auth";
import { resolveRequestId } from "@/lib/api/errors";
import { streamChat } from "@/lib/chat";
import {
  getActionTranslations,
  translateChatError,
  translateRateLimitError,
} from "@/lib/i18n/actions";
import { checkApiKeyRateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

type PlaygroundChatBody = {
  message?: unknown;
  session_id?: unknown;
  category?: unknown;
};

/**
 * Streaming chat for the "Try it live" playground. Authenticates with the
 * user's own API key so what they test is exactly what their product calls.
 *
 * The actual work is delegated to `streamChat` — the same core the public
 * /api/v1/chat endpoint uses — so the playground and the real API can never
 * drift apart. Only the error messages are localised here.
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

  const result = await streamChat({
    message,
    sessionId,
    category,
    partnerId: context.userId,
    apiKeyId: context.apiKeyId,
    signal: request.signal,
  });

  if (!result.ok) {
    return Response.json({ error: translateChatError(t, result.error) }, { status: 400 });
  }

  void recordApiUsage(
    { ...context, requestId: resolveRequestId(request) },
    request,
    200,
  );

  return new Response(result.stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
