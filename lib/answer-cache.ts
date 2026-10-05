// Semantic answer cache.
//
// Caches assistant answers keyed by the question embedding, so a repeat or a
// near-duplicate question skips retrieval and the LLM. Scoped per partner and
// only used for single-turn questions (a conversation with history is not
// cacheable, because the answer depends on prior turns).

import { embedQuery } from "@/lib/embeddings";
import { logError } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import type { KnowledgeSource } from "@/lib/types";

/** How similar a new question must be to reuse a cached answer. */
const SIMILARITY_THRESHOLD = Number(process.env.CHAT_CACHE_SIMILARITY ?? 0.96);

export function isAnswerCacheEnabled(): boolean {
  return process.env.CHAT_ANSWER_CACHE !== "false";
}

function normalizeQuestion(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

export type CachedAnswer = {
  answer: string;
  sources: KnowledgeSource[];
  similarity: number;
};

/**
 * Look up a cached answer for this exact partner. Only call for the first
 * message of a session; follow-ups depend on prior turns and must not be
 * served from cache.
 */
export async function getCachedAnswer({
  question,
  partnerId,
}: {
  question: string;
  partnerId: string;
}): Promise<CachedAnswer | null> {
  if (!isAnswerCacheEnabled()) return null;

  try {
    const embedding = await embedQuery(question);
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("match_chat_answer", {
      query_embedding: embedding,
      p_partner_id: partnerId,
      similarity_threshold: SIMILARITY_THRESHOLD,
    });

    if (error) throw new Error(error.message);

    const row = (data ?? [])[0] as
      | { id: string; answer: string; sources: KnowledgeSource[]; similarity: number }
      | undefined;

    if (!row) return null;

    return {
      answer: row.answer,
      sources: Array.isArray(row.sources) ? row.sources : [],
      similarity: row.similarity,
    };
  } catch (error) {
    logError("Answer cache lookup failed", error);
    return null;
  }
}

/** Store an answer so a repeat question can be served instantly. */
export async function storeCachedAnswer({
  question,
  partnerId,
  category,
  answer,
  sources,
}: {
  question: string;
  partnerId: string;
  category?: string;
  answer: string;
  sources: KnowledgeSource[];
}): Promise<void> {
  if (!isAnswerCacheEnabled()) return;

  try {
    const embedding = await embedQuery(question);
    const admin = createAdminClient();
    await admin.from("chat_answer_cache").insert({
      partner_id: partnerId,
      question_norm: normalizeQuestion(question),
      question,
      category: category ?? null,
      embedding,
      answer,
      sources,
    });
  } catch (error) {
    logError("Answer cache store failed", error);
  }
}

/** Drop all cached answers. Called when the knowledge base changes. */
export async function clearAnswerCache(): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("chat_answer_cache").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  } catch (error) {
    logError("Answer cache clear failed", error);
  }
}
