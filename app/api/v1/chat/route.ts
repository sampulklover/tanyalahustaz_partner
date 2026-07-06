import { apiError, apiSuccess, withApiAuth } from "@/lib/api/handler";
import { executeChat } from "@/lib/chat";
import type { ChatRequestBody } from "@/lib/types";

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

    if (typeof message !== "string") {
      return apiError("Field 'message' is required.");
    }

    if (session_id !== undefined && typeof session_id !== "string") {
      return apiError("Field 'session_id' must be a string.");
    }

    if (category !== undefined && typeof category !== "string") {
      return apiError("Field 'category' must be a string.");
    }

    const result = await executeChat({
      message,
      sessionId: session_id,
      category,
      partnerId: context.userId,
      apiKeyId: context.apiKeyId,
    });

    if (!result.ok) {
      return apiError(result.error, result.error.includes("OpenRouter") ? 502 : 400);
    }

    return apiSuccess(result.data);
  });
}
