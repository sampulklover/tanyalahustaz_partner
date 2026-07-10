import { NextResponse } from "next/server";
import { authenticateApiRequest, recordApiUsage } from "@/lib/api-auth";
import {
  apiError,
  resolveRequestId,
} from "@/lib/api/errors";
import {
  checkApiKeyRateLimit,
  rateLimitHeaders,
  type RateLimitTier,
} from "@/lib/rate-limit";
import type { AuthenticatedApiContext } from "@/lib/types";

export type AuthenticatedHandler = (
  request: Request,
  context: AuthenticatedApiContext,
) => Promise<NextResponse>;

type WithApiAuthOptions = {
  rateLimit?: Extract<RateLimitTier, "chat" | "api">;
};

export async function withApiAuth(
  request: Request,
  handler: AuthenticatedHandler,
  options: WithApiAuthOptions = {},
): Promise<NextResponse> {
  const requestId = resolveRequestId(request);
  const auth = await authenticateApiRequest(request);

  if (!auth.ok) {
    return apiError(auth.code, auth.error, auth.status, { requestId });
  }

  const tier = options.rateLimit ?? "api";
  const rateLimit = await checkApiKeyRateLimit(auth.context.apiKeyId, tier);

  if (!rateLimit.ok) {
    return apiError(rateLimit.code, rateLimit.error, 429, {
      requestId,
      extraHeaders: { "Retry-After": String(rateLimit.retryAfterSeconds) },
    });
  }

  const response = await handler(request, { ...auth.context, requestId });
  await recordApiUsage({ ...auth.context, requestId }, request, response.status);

  response.headers.set("X-Request-Id", requestId);

  const headers = rateLimitHeaders(rateLimit);
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }

  return response;
}

export { apiError, apiSuccess } from "@/lib/api/errors";

export function parsePagination(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 20), 1), 100);
  const offset = Math.max(Number(searchParams.get("offset") ?? 0), 0);

  return { limit, offset };
}
