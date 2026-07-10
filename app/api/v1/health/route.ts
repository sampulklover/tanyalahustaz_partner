import { NextResponse } from "next/server";
import { resolveRequestId } from "@/lib/api/errors";

export async function GET(request: Request) {
  const requestId = resolveRequestId(request);

  return NextResponse.json(
    {
      status: "ok",
      version: "v1",
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "X-Request-Id": requestId,
      },
    },
  );
}
