import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildChatMessages, normalizeChatUsage } from "./openrouter";
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

describe("normalizeChatUsage", () => {
  it("maps OpenRouter usage and cost to the billing shape", () => {
    const usage = normalizeChatUsage({
      prompt_tokens: 194,
      completion_tokens: 2,
      total_tokens: 196,
      cost: 0.00042,
    });

    assert.deepEqual(usage, {
      promptTokens: 194,
      completionTokens: 2,
      totalTokens: 196,
      costUsd: 0.00042,
    });
  });

  it("derives total tokens when the field is missing", () => {
    const usage = normalizeChatUsage({ prompt_tokens: 10, completion_tokens: 5 });
    assert.equal(usage?.totalTokens, 15);
    assert.equal(usage?.costUsd, 0);
  });

  it("returns null when there is no usage object", () => {
    assert.equal(normalizeChatUsage(undefined), null);
    assert.equal(normalizeChatUsage(null), null);
    assert.equal(normalizeChatUsage("nope"), null);
  });
});
