import { NextResponse } from "next/server";

export const ApiErrorCode = {
  MISSING_API_KEY: "MISSING_API_KEY",
  INVALID_API_KEY_FORMAT: "INVALID_API_KEY_FORMAT",
  INVALID_API_KEY: "INVALID_API_KEY",
  API_KEY_REVOKED: "API_KEY_REVOKED",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  DAILY_QUOTA_EXCEEDED: "DAILY_QUOTA_EXCEEDED",
  INVALID_JSON: "INVALID_JSON",
  INVALID_REQUEST_BODY: "INVALID_REQUEST_BODY",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  UPSTREAM_ERROR: "UPSTREAM_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];

export type ApiErrorBody = {
  error: {
    code: ApiErrorCode;
    message: string;
    request_id: string;
  };
};

const REQUEST_ID_PATTERN = /^[a-zA-Z0-9_-]{8,64}$/;

export function resolveRequestId(request?: Request): string {
  const incoming = request?.headers.get("x-request-id")?.trim();

  if (incoming && REQUEST_ID_PATTERN.test(incoming)) {
    return incoming;
  }

  return `req_${crypto.randomUUID().replace(/-/g, "")}`;
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  status = 400,
  options?: { requestId?: string; extraHeaders?: Record<string, string> },
) {
  const requestId = options?.requestId ?? resolveRequestId();

  return NextResponse.json(
    {
      error: {
        code,
        message,
        request_id: requestId,
      },
    } satisfies ApiErrorBody,
    {
      status,
      headers: {
        "X-Request-Id": requestId,
        ...options?.extraHeaders,
      },
    },
  );
}

export function apiSuccess<T extends Record<string, unknown>>(
  data: T,
  status = 200,
  requestId?: string,
) {
  const id = requestId ?? resolveRequestId();
  const response = NextResponse.json(data, { status });
  response.headers.set("X-Request-Id", id);
  return response;
}

export function mapChatError(error: string): { code: ApiErrorCode; status: number } {
  if (error.includes("OpenRouter")) {
    return { code: ApiErrorCode.UPSTREAM_ERROR, status: 502 };
  }

  return { code: ApiErrorCode.VALIDATION_ERROR, status: 400 };
}

export const API_ERROR_CATALOG: {
  code: ApiErrorCode;
  status: number;
  description: string;
}[] = [
  {
    code: ApiErrorCode.MISSING_API_KEY,
    status: 401,
    description: "No API key was provided in the Authorization or X-API-Key header.",
  },
  {
    code: ApiErrorCode.INVALID_API_KEY_FORMAT,
    status: 401,
    description: "The API key does not match the expected tlh_live_* format.",
  },
  {
    code: ApiErrorCode.INVALID_API_KEY,
    status: 401,
    description: "The API key is unknown or incorrect.",
  },
  {
    code: ApiErrorCode.API_KEY_REVOKED,
    status: 401,
    description: "The API key has been revoked and can no longer be used.",
  },
  {
    code: ApiErrorCode.RATE_LIMIT_EXCEEDED,
    status: 429,
    description: "Too many requests in the current minute. Retry after the Retry-After header value.",
  },
  {
    code: ApiErrorCode.DAILY_QUOTA_EXCEEDED,
    status: 429,
    description: "The daily request quota for this API key has been reached.",
  },
  {
    code: ApiErrorCode.INVALID_JSON,
    status: 400,
    description: "The request body is not valid JSON.",
  },
  {
    code: ApiErrorCode.INVALID_REQUEST_BODY,
    status: 400,
    description: "The request body must be a JSON object.",
  },
  {
    code: ApiErrorCode.VALIDATION_ERROR,
    status: 400,
    description: "One or more request fields failed validation.",
  },
  {
    code: ApiErrorCode.NOT_FOUND,
    status: 404,
    description: "The requested resource was not found.",
  },
  {
    code: ApiErrorCode.UPSTREAM_ERROR,
    status: 502,
    description: "An upstream AI provider failed while generating a response.",
  },
  {
    code: ApiErrorCode.INTERNAL_ERROR,
    status: 500,
    description: "An unexpected server error occurred.",
  },
];
