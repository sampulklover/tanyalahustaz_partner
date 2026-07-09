import { NextResponse } from "next/server";
import { authenticateApiRequest, recordApiUsage } from "@/lib/api-auth";
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
  const auth = await authenticateApiRequest(request);

  if (!auth.ok) {
    return apiError(auth.error, auth.status);
  }

  const tier = options.rateLimit ?? "api";
  const rateLimit = await checkApiKeyRateLimit(auth.context.apiKeyId, tier);

  if (!rateLimit.ok) {
    return apiError(rateLimit.error, 429, {
      "Retry-After": String(rateLimit.retryAfterSeconds),
    });
  }

  const response = await handler(request, auth.context);
  await recordApiUsage(auth.context, request, response.status);

  const headers = rateLimitHeaders(rateLimit);
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }

  return response;
}

export function apiError(
  message: string,
  status = 400,
  extraHeaders?: Record<string, string>,
) {
  return NextResponse.json(
    { error: message },
    { status, headers: extraHeaders },
  );
}

export function apiSuccess<T extends Record<string, unknown>>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function parsePagination(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 20), 1), 100);
  const offset = Math.max(Number(searchParams.get("offset") ?? 0), 0);

  return { limit, offset };
}
