import { NextResponse } from "next/server";
import { resolveRequestId } from "@/lib/api/errors";
import { getOpenApiSpec } from "@/lib/api/openapi";

export async function GET(request: Request) {
  const requestId = resolveRequestId(request);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const spec = getOpenApiSpec(baseUrl);

  return NextResponse.json(spec, {
    headers: {
      "X-Request-Id": requestId,
      "Cache-Control": "public, max-age=300",
    },
  });
}
