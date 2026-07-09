import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateChatMessage } from "./chat";

describe("validateChatMessage", () => {
  it("rejects messages shorter than 3 characters", () => {
    const result = validateChatMessage("hi");
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /at least 3/i);
    }
  });

  it("accepts valid messages and trims whitespace", () => {
    const result = validateChatMessage("  What is zakat?  ");
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.message, "What is zakat?");
    }
  });

  it("rejects messages over 4000 characters", () => {
    const result = validateChatMessage("a".repeat(4001));
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /4000/);
    }
  });
});
