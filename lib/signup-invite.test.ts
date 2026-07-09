import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashInviteCode } from "./signup-invite";

describe("hashInviteCode", () => {
  it("normalizes invite codes before hashing", () => {
    const upper = hashInviteCode("BETA-CODE");
    const spaced = hashInviteCode("  beta-code  ");
    assert.equal(upper, spaced);
    assert.match(upper, /^[a-f0-9]{64}$/);
  });
});
