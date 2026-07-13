import { apiError, apiSuccess, parsePagination, withApiAuth } from "@/lib/api/handler";
import { ApiErrorCode } from "@/lib/api/errors";
import { deleteChatSession, loadChatSessionMessages } from "@/lib/chat-history";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  const { sessionId } = await params;
  const decodedSessionId = decodeURIComponent(sessionId ?? "").trim();

  return withApiAuth(request, async (req, context) => {
    if (!decodedSessionId) {
      return apiError(
        ApiErrorCode.VALIDATION_ERROR,
        "Path parameter 'sessionId' is required.",
        400,
        { requestId: context.requestId },
      );
    }

    const { limit, offset } = parsePagination(req);
    const result = await loadChatSessionMessages({
      partnerId: context.userId,
      sessionId: decodedSessionId,
      limit,
      offset,
    });

    if ("error" in result) {
      return apiError(ApiErrorCode.INTERNAL_ERROR, result.error, 500, {
        requestId: context.requestId,
      });
    }

    if (!result.found) {
      return apiError(ApiErrorCode.NOT_FOUND, "Chat session not found.", 404, {
        requestId: context.requestId,
      });
    }

    return apiSuccess(
      {
        session_id: decodedSessionId,
        data: result.data,
        pagination: { limit, offset, total: result.total },
      },
      200,
      context.requestId,
    );
  });
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const { sessionId } = await params;
  const decodedSessionId = decodeURIComponent(sessionId ?? "").trim();

  return withApiAuth(request, async (_req, context) => {
    if (!decodedSessionId) {
      return apiError(
        ApiErrorCode.VALIDATION_ERROR,
        "Path parameter 'sessionId' is required.",
        400,
        { requestId: context.requestId },
      );
    }

    const result = await deleteChatSession({
      partnerId: context.userId,
      sessionId: decodedSessionId,
    });

    if ("error" in result) {
      return apiError(ApiErrorCode.INTERNAL_ERROR, result.error, 500, {
        requestId: context.requestId,
      });
    }

    if (!result.found) {
      return apiError(ApiErrorCode.NOT_FOUND, "Chat session not found.", 404, {
        requestId: context.requestId,
      });
    }

    return apiSuccess(
      {
        deleted: true,
        session_id: decodedSessionId,
        deleted_turns: result.deleted_turns,
      },
      200,
      context.requestId,
    );
  });
}
