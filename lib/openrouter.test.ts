import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildChatMessages, getChatMaxTokens, isPromptCacheEnabled, normalizeChatUsage, selectChatModel } from "./openrouter";
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

  it("marks the system prompt for reuse when prompt caching is on", () => {
    const messages = buildChatMessages({
      userMessage: "hi",
      knowledgeContext: NO_KNOWLEDGE_CONTEXT,
      promptCache: true,
    });

    const system = messages.find((message) => message.role === "system");
    assert.deepEqual(system?.cache_control, { type: "ephemeral" });
  });

  it("leaves the system prompt unmarked when prompt caching is off", () => {
    const messages = buildChatMessages({
      userMessage: "hi",
      knowledgeContext: NO_KNOWLEDGE_CONTEXT,
    });

    assert.equal(messages.find((message) => message.role === "system")?.cache_control, undefined);
  });
});

describe("getChatMaxTokens", () => {
  it("defaults to a positive cap", () => {
    const previous = process.env.CHAT_MAX_TOKENS;
    delete process.env.CHAT_MAX_TOKENS;
    assert.equal(getChatMaxTokens(), 1200);
    if (previous !== undefined) process.env.CHAT_MAX_TOKENS = previous;
  });

  it("disables the cap when set to zero or invalid", () => {
    const previous = process.env.CHAT_MAX_TOKENS;
    process.env.CHAT_MAX_TOKENS = "0";
    assert.equal(getChatMaxTokens(), undefined);
    process.env.CHAT_MAX_TOKENS = "abc";
    assert.equal(getChatMaxTokens(), undefined);
    if (previous !== undefined) process.env.CHAT_MAX_TOKENS = previous;
    else delete process.env.CHAT_MAX_TOKENS;
  });
});

describe("isPromptCacheEnabled", () => {
  it("is on unless explicitly disabled", () => {
    const previous = process.env.CHAT_PROMPT_CACHE;
    delete process.env.CHAT_PROMPT_CACHE;
    assert.equal(isPromptCacheEnabled(), true);
    process.env.CHAT_PROMPT_CACHE = "false";
    assert.equal(isPromptCacheEnabled(), false);
    if (previous !== undefined) process.env.CHAT_PROMPT_CACHE = previous;
    else delete process.env.CHAT_PROMPT_CACHE;
  });
});

describe("selectChatModel", () => {
  it("routes small talk to the fast model and questions to the main model", () => {
    const previousMain = process.env.OPENROUTER_MODEL;
    const previousFast = process.env.OPENROUTER_MODEL_FAST;
    process.env.OPENROUTER_MODEL = "main/model";
    process.env.OPENROUTER_MODEL_FAST = "fast/model";

    assert.equal(selectChatModel("hi"), "fast/model");
    assert.equal(selectChatModel("apa khabar"), "fast/model");
    assert.equal(selectChatModel("what is zakat"), "main/model");

    if (previousMain !== undefined) process.env.OPENROUTER_MODEL = previousMain;
    else delete process.env.OPENROUTER_MODEL;
    if (previousFast !== undefined) process.env.OPENROUTER_MODEL_FAST = previousFast;
    else delete process.env.OPENROUTER_MODEL_FAST;
  });

  it("falls back to the main model when no fast model is set", () => {
    const previousMain = process.env.OPENROUTER_MODEL;
    const previousFast = process.env.OPENROUTER_MODEL_FAST;
    process.env.OPENROUTER_MODEL = "main/model";
    delete process.env.OPENROUTER_MODEL_FAST;

    assert.equal(selectChatModel("hi"), "main/model");

    if (previousMain !== undefined) process.env.OPENROUTER_MODEL = previousMain;
    else delete process.env.OPENROUTER_MODEL;
    if (previousFast !== undefined) process.env.OPENROUTER_MODEL_FAST = previousFast;
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
