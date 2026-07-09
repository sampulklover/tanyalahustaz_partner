import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashApiKey } from "./api-keys";

describe("hashApiKey", () => {
  it("returns a deterministic SHA-256 hex digest", () => {
    const first = hashApiKey("tlh_live_test-key");
    const second = hashApiKey("tlh_live_test-key");
    assert.equal(first, second);
    assert.match(first, /^[a-f0-9]{64}$/);
  });

  it("produces different hashes for different keys", () => {
    const a = hashApiKey("tlh_live_key-a");
    const b = hashApiKey("tlh_live_key-b");
    assert.notEqual(a, b);
  });
});
