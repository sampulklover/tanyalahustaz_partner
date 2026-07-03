import { NextResponse } from "next/server";
import { authenticateApiRequest, recordApiUsage } from "@/lib/api-auth";
import type { AuthenticatedApiContext } from "@/lib/types";

export type AuthenticatedHandler = (
  request: Request,
  context: AuthenticatedApiContext,
) => Promise<NextResponse>;

export async function withApiAuth(
  request: Request,
  handler: AuthenticatedHandler,
): Promise<NextResponse> {
  const auth = await authenticateApiRequest(request);

  if (!auth.ok) {
    return apiError(auth.error, auth.status);
  }

  const response = await handler(request, auth.context);
  await recordApiUsage(auth.context, request, response.status);
  return response;
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
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
