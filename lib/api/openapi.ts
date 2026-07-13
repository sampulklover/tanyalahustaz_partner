import { API_ERROR_CATALOG } from "@/lib/api/errors";

const apiErrorSchema = {
  type: "object",
  required: ["error"],
  properties: {
    error: {
      type: "object",
      required: ["code", "message", "request_id"],
      properties: {
        code: {
          type: "string",
          enum: API_ERROR_CATALOG.map((entry) => entry.code),
        },
        message: { type: "string" },
        request_id: { type: "string", example: "req_abc123def456" },
      },
    },
  },
} as const;

const securitySchemes = {
  bearerAuth: {
    type: "http",
    scheme: "bearer",
    description: "Partner API key prefixed with tlh_live_",
  },
  apiKeyHeader: {
    type: "apiKey",
    in: "header",
    name: "X-API-Key",
    description: "Alternative to Authorization: Bearer",
  },
} as const;

export function getOpenApiSpec(baseUrl: string) {
  const serverUrl = `${baseUrl.replace(/\/$/, "")}/api/v1`;

  return {
    openapi: "3.1.0",
    info: {
      title: "TanyaLah Ustaz Partner API",
      version: "1.0.0",
      description:
        "Knowledge-backed Islamic AI API for partner integrations. Authenticate with a tlh_live_* API key.",
      contact: {
        name: "TanyaLah Ustaz Partner Support",
        url: baseUrl,
      },
    },
    servers: [{ url: serverUrl }],
    tags: [
      { name: "System", description: "Health and metadata endpoints" },
      { name: "Partner", description: "Authenticated partner endpoints" },
      { name: "Chat", description: "AI chat with knowledge retrieval" },
    ],
    components: {
      securitySchemes,
      schemas: {
        ApiError: apiErrorSchema,
        HealthResponse: {
          type: "object",
          properties: {
            status: { type: "string", example: "ok" },
            version: { type: "string", example: "v1" },
            timestamp: { type: "string", format: "date-time" },
          },
        },
        PartnerProfile: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            email: { type: "string", format: "email" },
            company_name: { type: "string", nullable: true },
            created_at: { type: "string", format: "date-time" },
          },
        },
        ApiKeyMetadata: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            last_used_at: { type: "string", format: "date-time", nullable: true },
          },
        },
        MeResponse: {
          type: "object",
          properties: {
            partner: { $ref: "#/components/schemas/PartnerProfile" },
            api_key: { $ref: "#/components/schemas/ApiKeyMetadata" },
          },
        },
        ChatRequest: {
          type: "object",
          required: ["message"],
          properties: {
            message: {
              type: "string",
              minLength: 3,
              maxLength: 4000,
              description: "The user's question.",
            },
            session_id: {
              type: "string",
              description: "Optional session identifier for multi-turn conversations.",
            },
            category: {
              type: "string",
              description: "Optional topic filter such as fiqh, ibadah, aqidah, or akhlak.",
            },
          },
        },
        KnowledgeSource: {
          type: "object",
          properties: {
            slug: { type: "string" },
            title: { type: "string" },
            category: { type: "string" },
          },
        },
        ChatResponse: {
          type: "object",
          properties: {
            reply: { type: "string" },
            session_id: { type: "string" },
            sources: {
              type: "array",
              items: { $ref: "#/components/schemas/KnowledgeSource" },
            },
          },
        },
        ChatSessionSummary: {
          type: "object",
          properties: {
            session_id: { type: "string" },
            turn_count: {
              type: "integer",
              description: "Number of user/assistant turns stored for this session.",
            },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
            last_user_message: { type: "string" },
          },
        },
        ChatSessionListResponse: {
          type: "object",
          properties: {
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/ChatSessionSummary" },
            },
            pagination: { $ref: "#/components/schemas/Pagination" },
          },
        },
        ChatSessionMessage: {
          type: "object",
          properties: {
            id: { type: "string" },
            role: { type: "string", enum: ["user", "assistant"] },
            content: { type: "string" },
            sources: {
              type: "array",
              items: { $ref: "#/components/schemas/KnowledgeSource" },
              description: "Present on assistant messages when knowledge sources were cited.",
            },
            created_at: { type: "string", format: "date-time" },
          },
        },
        ChatSessionHistoryResponse: {
          type: "object",
          properties: {
            session_id: { type: "string" },
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/ChatSessionMessage" },
            },
            pagination: { $ref: "#/components/schemas/Pagination" },
          },
        },
        ChatSessionDeleteResponse: {
          type: "object",
          properties: {
            deleted: { type: "boolean", example: true },
            session_id: { type: "string" },
            deleted_turns: { type: "integer" },
          },
        },
        ChatSessionsDeleteAllResponse: {
          type: "object",
          properties: {
            deleted: { type: "boolean", example: true },
            deleted_turns: { type: "integer" },
          },
        },
        Pagination: {
          type: "object",
          properties: {
            limit: { type: "integer" },
            offset: { type: "integer" },
            total: { type: "integer" },
          },
        },
        UsageEndpointCount: {
          type: "object",
          properties: {
            endpoint: { type: "string" },
            count: { type: "integer" },
          },
        },
        UsageRequestEntry: {
          type: "object",
          properties: {
            endpoint: { type: "string" },
            method: { type: "string" },
            status_code: { type: "integer", nullable: true },
            created_at: { type: "string", format: "date-time" },
          },
        },
        UsageResponse: {
          type: "object",
          properties: {
            period_days: { type: "integer", example: 30 },
            total_requests: { type: "integer" },
            top_endpoints: {
              type: "array",
              items: { $ref: "#/components/schemas/UsageEndpointCount" },
            },
            recent_requests: {
              type: "array",
              items: { $ref: "#/components/schemas/UsageRequestEntry" },
            },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: "Missing or invalid API key",
          headers: {
            "X-Request-Id": { schema: { type: "string" } },
          },
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiError" },
            },
          },
        },
        RateLimited: {
          description: "Rate limit or daily quota exceeded",
          headers: {
            "X-Request-Id": { schema: { type: "string" } },
            "Retry-After": { schema: { type: "integer" } },
            "X-RateLimit-Remaining-Minute": { schema: { type: "integer" } },
            "X-RateLimit-Remaining-Day": { schema: { type: "integer" } },
          },
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiError" },
            },
          },
        },
        ValidationError: {
          description: "Request validation failed",
          headers: {
            "X-Request-Id": { schema: { type: "string" } },
          },
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiError" },
            },
          },
        },
        NotFound: {
          description: "Resource not found",
          headers: {
            "X-Request-Id": { schema: { type: "string" } },
          },
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiError" },
            },
          },
        },
        UpstreamError: {
          description: "Upstream AI provider failure",
          headers: {
            "X-Request-Id": { schema: { type: "string" } },
          },
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiError" },
            },
          },
        },
        InternalError: {
          description: "Unexpected server error",
          headers: {
            "X-Request-Id": { schema: { type: "string" } },
          },
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiError" },
            },
          },
        },
      },
    },
    paths: {
      "/health": {
        get: {
          tags: ["System"],
          summary: "Health check",
          description: "Public liveness probe. No authentication required.",
          responses: {
            "200": {
              description: "Service is healthy",
              headers: {
                "X-Request-Id": { schema: { type: "string" } },
              },
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/HealthResponse" },
                },
              },
            },
          },
        },
      },
      "/me": {
        get: {
          tags: ["Partner"],
          summary: "Get authenticated partner profile",
          security: [{ bearerAuth: [] }, { apiKeyHeader: [] }],
          responses: {
            "200": {
              description: "Partner profile and API key metadata",
              headers: {
                "X-Request-Id": { schema: { type: "string" } },
                "X-RateLimit-Remaining-Minute": { schema: { type: "integer" } },
                "X-RateLimit-Remaining-Day": { schema: { type: "integer" } },
              },
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/MeResponse" },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { $ref: "#/components/responses/NotFound" },
            "429": { $ref: "#/components/responses/RateLimited" },
          },
        },
      },
      "/chat": {
        post: {
          tags: ["Chat"],
          summary: "Send a chat message",
          description:
            "Main integration endpoint. Retrieves relevant knowledge and returns a grounded AI reply with sources.",
          security: [{ bearerAuth: [] }, { apiKeyHeader: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ChatRequest" },
              },
            },
          },
          responses: {
            "200": {
              description: "AI reply with cited sources",
              headers: {
                "X-Request-Id": { schema: { type: "string" } },
                "X-RateLimit-Remaining-Minute": { schema: { type: "integer" } },
                "X-RateLimit-Remaining-Day": { schema: { type: "integer" } },
              },
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ChatResponse" },
                },
              },
            },
            "400": { $ref: "#/components/responses/ValidationError" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "429": { $ref: "#/components/responses/RateLimited" },
            "502": { $ref: "#/components/responses/UpstreamError" },
          },
        },
      },
      "/chat/sessions": {
        get: {
          tags: ["Chat"],
          summary: "List chat sessions",
          description:
            "Returns conversation sessions for the authenticated partner, newest activity first. Supports limit and offset pagination.",
          security: [{ bearerAuth: [] }, { apiKeyHeader: [] }],
          parameters: [
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
            },
            {
              name: "offset",
              in: "query",
              schema: { type: "integer", minimum: 0, default: 0 },
            },
          ],
          responses: {
            "200": {
              description: "Paginated session list",
              headers: {
                "X-Request-Id": { schema: { type: "string" } },
                "X-RateLimit-Remaining-Minute": { schema: { type: "integer" } },
                "X-RateLimit-Remaining-Day": { schema: { type: "integer" } },
              },
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ChatSessionListResponse" },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "429": { $ref: "#/components/responses/RateLimited" },
            "500": { $ref: "#/components/responses/InternalError" },
          },
        },
        delete: {
          tags: ["Chat"],
          summary: "Delete all chat history",
          description:
            "Permanently deletes every chat session for the authenticated partner. Requires ?confirm=all to prevent accidental wipes.",
          security: [{ bearerAuth: [] }, { apiKeyHeader: [] }],
          parameters: [
            {
              name: "confirm",
              in: "query",
              required: true,
              schema: { type: "string", enum: ["all"] },
              description: 'Must be the literal value "all".',
            },
          ],
          responses: {
            "200": {
              description: "All chat history deleted",
              headers: {
                "X-Request-Id": { schema: { type: "string" } },
                "X-RateLimit-Remaining-Minute": { schema: { type: "integer" } },
                "X-RateLimit-Remaining-Day": { schema: { type: "integer" } },
              },
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ChatSessionsDeleteAllResponse" },
                },
              },
            },
            "400": { $ref: "#/components/responses/ValidationError" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "429": { $ref: "#/components/responses/RateLimited" },
            "500": { $ref: "#/components/responses/InternalError" },
          },
        },
      },
      "/chat/sessions/{sessionId}": {
        get: {
          tags: ["Chat"],
          summary: "Get chat history for a session",
          description:
            "Returns messages for a session in chronological order. Pagination limit/offset apply to conversation turns (each turn expands to one user and one assistant message).",
          security: [{ bearerAuth: [] }, { apiKeyHeader: [] }],
          parameters: [
            {
              name: "sessionId",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "The session_id previously used with POST /chat.",
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
              description: "Max conversation turns to return.",
            },
            {
              name: "offset",
              in: "query",
              schema: { type: "integer", minimum: 0, default: 0 },
              description: "Number of conversation turns to skip.",
            },
          ],
          responses: {
            "200": {
              description: "Session message history",
              headers: {
                "X-Request-Id": { schema: { type: "string" } },
                "X-RateLimit-Remaining-Minute": { schema: { type: "integer" } },
                "X-RateLimit-Remaining-Day": { schema: { type: "integer" } },
              },
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ChatSessionHistoryResponse" },
                },
              },
            },
            "400": { $ref: "#/components/responses/ValidationError" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { $ref: "#/components/responses/NotFound" },
            "429": { $ref: "#/components/responses/RateLimited" },
            "500": { $ref: "#/components/responses/InternalError" },
          },
        },
        delete: {
          tags: ["Chat"],
          summary: "Delete a chat session",
          description:
            "Permanently deletes all turns for the given session_id belonging to the authenticated partner.",
          security: [{ bearerAuth: [] }, { apiKeyHeader: [] }],
          parameters: [
            {
              name: "sessionId",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "The session_id previously used with POST /chat.",
            },
          ],
          responses: {
            "200": {
              description: "Session deleted",
              headers: {
                "X-Request-Id": { schema: { type: "string" } },
                "X-RateLimit-Remaining-Minute": { schema: { type: "integer" } },
                "X-RateLimit-Remaining-Day": { schema: { type: "integer" } },
              },
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ChatSessionDeleteResponse" },
                },
              },
            },
            "400": { $ref: "#/components/responses/ValidationError" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { $ref: "#/components/responses/NotFound" },
            "429": { $ref: "#/components/responses/RateLimited" },
            "500": { $ref: "#/components/responses/InternalError" },
          },
        },
      },
      "/usage": {
        get: {
          tags: ["Partner"],
          summary: "Get API usage statistics",
          description: "Usage for the current API key over the last 30 days.",
          security: [{ bearerAuth: [] }, { apiKeyHeader: [] }],
          responses: {
            "200": {
              description: "Usage summary",
              headers: {
                "X-Request-Id": { schema: { type: "string" } },
                "X-RateLimit-Remaining-Minute": { schema: { type: "integer" } },
                "X-RateLimit-Remaining-Day": { schema: { type: "integer" } },
              },
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/UsageResponse" },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "429": { $ref: "#/components/responses/RateLimited" },
          },
        },
      },
    },
  };
}
