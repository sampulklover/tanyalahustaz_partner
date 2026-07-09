import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sanitizeIlikeQuery } from "./sanitize";

describe("sanitizeIlikeQuery", () => {
  it("removes PostgREST filter injection characters", () => {
    assert.equal(sanitizeIlikeQuery("zakat,(malicious)"), "zakat malicious");
  });

  it("removes SQL wildcards", () => {
    assert.equal(sanitizeIlikeQuery("100%_match"), "100match");
  });

  it("truncates long queries", () => {
    const long = "a".repeat(200);
    assert.equal(sanitizeIlikeQuery(long).length, 100);
  });

  it("returns empty string for whitespace-only input", () => {
    assert.equal(sanitizeIlikeQuery("   "), "");
  });
});
