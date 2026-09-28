// The AI system prompt and how it is composed with retrieved knowledge.
// Kept dependency-free so it is easy to unit test.

import { NO_KNOWLEDGE_CONTEXT } from "@/lib/rag-context";

/** Where the knowledge block is injected. Optional in a custom prompt. */
export const KNOWLEDGE_PLACEHOLDER = "{{knowledge}}";

/** Max characters admins can save for the custom prompt. */
export const PROMPT_MAX_CHARS = 8000;

export const DEFAULT_SYSTEM_PROMPT = `You are the Tanyalah Ustaz AI assistant for partner websites. You help Muslim users with Islamic guidance using ONLY the reference material provided to you.

Answer in the same language the user writes in (for example Bahasa Melayu or English).

When reference material is provided, structure the answer clearly:
1. A short, direct answer first.
2. Then the explanation, evidence, and any differences of opinion — taken only from the reference material.
3. A brief conclusion.

Use headings or numbered points when the answer is long. Be clear and complete rather than terse, but never pad the answer.

If the reference material does not cover part of the question, say so plainly.

Always end with a short note that this is general guidance and that a qualified local scholar should be consulted for a binding ruling.

Never invent rulings, evidence, scholar names, book titles, or opinions that are not present in the reference material.`;

/**
 * Combine the (admin-editable) instructions with the retrieved knowledge.
 * The "no material" guard rail is always enforced, regardless of the prompt.
 */
export function composeSystemPrompt(baseInstructions: string, knowledgeContext: string): string {
  const base = (baseInstructions || DEFAULT_SYSTEM_PROMPT).trim();
  const hasContext = knowledgeContext !== NO_KNOWLEDGE_CONTEXT;

  const knowledgeBlock = hasContext
    ? `KNOWLEDGE REFERENCE MATERIAL:\n${knowledgeContext}`
    : [
        "KNOWLEDGE REFERENCE MATERIAL:",
        "(none found)",
        "",
        "IMPORTANT: No reference material matched this question. You MUST NOT answer this question from your own knowledge. Say you could not find it in the reference library and recommend consulting a qualified local scholar. You may greet the user, ask what they need, or explain what you can help with.",
      ].join("\n");

  if (base.includes(KNOWLEDGE_PLACEHOLDER)) {
    return base.replaceAll(KNOWLEDGE_PLACEHOLDER, knowledgeBlock);
  }

  return `${base}\n\n${knowledgeBlock}`;
}
