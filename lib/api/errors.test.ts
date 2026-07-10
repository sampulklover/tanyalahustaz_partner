import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ApiErrorCode,
  mapChatError,
  resolveRequestId,
} from "./errors";
import { getOpenApiSpec } from "./openapi";

describe("resolveRequestId", () => {
  it("echoes a valid incoming X-Request-Id header", () => {
    const request = new Request("https://example.com", {
      headers: { "X-Request-Id": "partner-trace-12345678" },
    });

    assert.equal(resolveRequestId(request), "partner-trace-12345678");
  });

  it("rejects invalid incoming ids and generates a new one", () => {
    const request = new Request("https://example.com", {
      headers: { "X-Request-Id": "bad id with spaces" },
    });

    const requestId = resolveRequestId(request);
    assert.match(requestId, /^req_[a-f0-9]{32}$/);
  });

  it("generates a request id when none is provided", () => {
    const requestId = resolveRequestId();
    assert.match(requestId, /^req_[a-f0-9]{32}$/);
  });
});

describe("mapChatError", () => {
  it("maps OpenRouter failures to upstream errors", () => {
    const mapped = mapChatError("OpenRouter request failed with status 503");
    assert.equal(mapped.code, ApiErrorCode.UPSTREAM_ERROR);
    assert.equal(mapped.status, 502);
  });

  it("maps validation failures to validation errors", () => {
    const mapped = mapChatError("Message must be at least 3 characters.");
    assert.equal(mapped.code, ApiErrorCode.VALIDATION_ERROR);
    assert.equal(mapped.status, 400);
  });
});

describe("getOpenApiSpec", () => {
  it("builds a v1 spec with all documented paths", () => {
    const spec = getOpenApiSpec("https://partner.example.com");

    assert.equal(spec.openapi, "3.1.0");
    assert.equal(spec.servers[0].url, "https://partner.example.com/api/v1");
    assert.ok(spec.paths["/health"]);
    assert.ok(spec.paths["/chat"]);
    assert.ok(spec.paths["/knowledge"]);
    assert.ok(spec.paths["/knowledge/{slug}"]);
    assert.ok(spec.paths["/usage"]);
    assert.ok(spec.components.schemas.ApiError);
  });
});
