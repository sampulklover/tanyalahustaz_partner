import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  composeSystemPrompt,
  DEFAULT_SYSTEM_PROMPT,
  KNOWLEDGE_PLACEHOLDER,
} from "./ai-prompt";
import { NO_KNOWLEDGE_CONTEXT } from "./rag-context";

describe("composeSystemPrompt", () => {
  it("appends the knowledge block when there is no placeholder", () => {
    const result = composeSystemPrompt("Be helpful.", "Some reference text");

    assert.ok(result.startsWith("Be helpful."));
    assert.ok(result.includes("KNOWLEDGE REFERENCE MATERIAL:"));
    assert.ok(result.includes("Some reference text"));
  });

  it("injects the knowledge block at the placeholder when present", () => {
    const result = composeSystemPrompt(`Rules first.\n${KNOWLEDGE_PLACEHOLDER}\nRules after.`, "REF");

    assert.ok(result.includes("Rules first.\nKNOWLEDGE REFERENCE MATERIAL:\nREF\nRules after."));
    assert.ok(!result.includes(KNOWLEDGE_PLACEHOLDER));
  });

  it("enforces the no-material guard when nothing was retrieved", () => {
    const result = composeSystemPrompt("Any custom prompt.", NO_KNOWLEDGE_CONTEXT);

    assert.ok(result.includes("MUST NOT answer this question from your own knowledge"));
    assert.ok(!result.includes(NO_KNOWLEDGE_CONTEXT));
  });

  it("falls back to the default instructions when blank", () => {
    const result = composeSystemPrompt("", "REF");

    assert.ok(result.includes(DEFAULT_SYSTEM_PROMPT.slice(0, 40)));
  });
});
