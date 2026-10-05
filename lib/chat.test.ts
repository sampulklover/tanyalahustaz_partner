import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { encodeChatStreamEvent, validateChatMessage } from "./chat";

describe("validateChatMessage", () => {
  it("accepts short greetings like 'hi'", () => {
    const result = validateChatMessage("hi");
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.message, "hi");
    }
  });

  it("rejects empty or whitespace-only messages", () => {
    const result = validateChatMessage("   ");
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /empty/i);
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

describe("encodeChatStreamEvent", () => {
  it("encodes text events as SSE data lines", () => {
    assert.equal(
      encodeChatStreamEvent({ type: "text", content: "Salam" }),
      'data: {"type":"text","content":"Salam"}\n\n',
    );
  });

  it("encodes meta and terminal events", () => {
    assert.equal(
      encodeChatStreamEvent({ type: "meta", session_id: "s1", sources: [] }),
      'data: {"type":"meta","session_id":"s1","sources":[]}\n\n',
    );
    assert.equal(encodeChatStreamEvent({ type: "done" }), 'data: {"type":"done"}\n\n');
  });
});
