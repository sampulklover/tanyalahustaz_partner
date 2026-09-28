import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildChatMessages } from "./openrouter";
import { NO_KNOWLEDGE_CONTEXT } from "./rag-context";

function systemContent(messages: ReturnType<typeof buildChatMessages>) {
  const system = messages.find((message) => message.role === "system");
  return typeof system?.content === "string" ? system.content : "";
}

describe("buildChatMessages", () => {
  it("refuses to answer from general knowledge when no context matched", () => {
    const content = systemContent(
      buildChatMessages({ userMessage: "Who is Imam Haitami?", knowledgeContext: NO_KNOWLEDGE_CONTEXT }),
    );

    assert.ok(content.includes("MUST NOT answer this question from your own knowledge"));
  });

  it("allows grounded answers when context is present", () => {
    const content = systemContent(
      buildChatMessages({
        userMessage: "Can a traveler combine prayers?",
        knowledgeContext: "[Source 1: Jamak (fiqh)]\nTravelers may combine Dhuhr with Asr…",
      }),
    );

    assert.ok(!content.includes("MUST NOT answer this question from your own knowledge"));
    assert.ok(content.includes("KNOWLEDGE REFERENCE MATERIAL:"));
    assert.ok(content.includes("Travelers may combine"));
  });

  it("includes prior conversation history before the user message", () => {
    const messages = buildChatMessages({
      userMessage: "and Asr?",
      knowledgeContext: NO_KNOWLEDGE_CONTEXT,
      history: [
        { role: "user", content: "Can I combine Dhuhr?" },
        { role: "assistant", content: "During travel, yes." },
      ],
    });

    assert.equal(messages.at(-1)?.role, "user");
    assert.equal(messages.filter((message) => message.role === "assistant").length, 1);
  });
});
