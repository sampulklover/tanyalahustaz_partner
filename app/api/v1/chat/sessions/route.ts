import { apiError, apiSuccess, parsePagination, withApiAuth } from "@/lib/api/handler";
import { ApiErrorCode } from "@/lib/api/errors";
import { deleteAllChatSessions, listChatSessions } from "@/lib/chat-history";

export async function GET(request: Request) {
  return withApiAuth(request, async (req, context) => {
    const { limit, offset } = parsePagination(req);
    const result = await listChatSessions({
      partnerId: context.userId,
      limit,
      offset,
    });

    if ("error" in result) {
      return apiError(ApiErrorCode.INTERNAL_ERROR, result.error, 500, {
        requestId: context.requestId,
      });
    }

    return apiSuccess(
      {
        data: result.data,
        pagination: { limit, offset, total: result.total },
      },
      200,
      context.requestId,
    );
  });
}

export async function DELETE(request: Request) {
  return withApiAuth(request, async (req, context) => {
    const { searchParams } = new URL(req.url);
    const confirm = searchParams.get("confirm");

    if (confirm !== "all") {
      return apiError(
        ApiErrorCode.VALIDATION_ERROR,
        "Deleting all chat history requires ?confirm=all.",
        400,
        { requestId: context.requestId },
      );
    }

    const result = await deleteAllChatSessions({ partnerId: context.userId });

    if ("error" in result) {
      return apiError(ApiErrorCode.INTERNAL_ERROR, result.error, 500, {
        requestId: context.requestId,
      });
    }

    return apiSuccess(
      {
        deleted: true,
        deleted_turns: result.deleted_turns,
      },
      200,
      context.requestId,
    );
  });
}
