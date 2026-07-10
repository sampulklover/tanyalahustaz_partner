import { apiError, apiSuccess, withApiAuth } from "@/lib/api/handler";
import { ApiErrorCode, mapChatError } from "@/lib/api/errors";
import { executeChat } from "@/lib/chat";
import type { ChatRequestBody } from "@/lib/types";

export const maxDuration = 60;

export async function POST(request: Request) {
  return withApiAuth(request, async (req, context) => {
    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return apiError(
        ApiErrorCode.INVALID_JSON,
        "Request body must be valid JSON.",
        400,
        { requestId: context.requestId },
      );
    }

    if (!body || typeof body !== "object") {
      return apiError(
        ApiErrorCode.INVALID_REQUEST_BODY,
        "Request body must be a JSON object.",
        400,
        { requestId: context.requestId },
      );
    }

    const { message, session_id, category } = body as ChatRequestBody;

    if (typeof message !== "string") {
      return apiError(
        ApiErrorCode.VALIDATION_ERROR,
        "Field 'message' is required.",
        400,
        { requestId: context.requestId },
      );
    }

    if (session_id !== undefined && typeof session_id !== "string") {
      return apiError(
        ApiErrorCode.VALIDATION_ERROR,
        "Field 'session_id' must be a string.",
        400,
        { requestId: context.requestId },
      );
    }

    if (category !== undefined && typeof category !== "string") {
      return apiError(
        ApiErrorCode.VALIDATION_ERROR,
        "Field 'category' must be a string.",
        400,
        { requestId: context.requestId },
      );
    }

    const result = await executeChat({
      message,
      sessionId: session_id,
      category,
      partnerId: context.userId,
      apiKeyId: context.apiKeyId,
    });

    if (!result.ok) {
      const mapped = mapChatError(result.error);
      return apiError(mapped.code, result.error, mapped.status, {
        requestId: context.requestId,
      });
    }

    return apiSuccess(result.data, 200, context.requestId);
  }, { rateLimit: "chat" });
}
