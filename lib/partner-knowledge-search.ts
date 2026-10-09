// Retrieval over one partner's private knowledge base.
//
// Deliberately separate from lib/knowledge.ts: the shared pipeline is global and
// must stay that way. This searches only the chunks owned by `partnerId`.

import { embedQuery } from "@/lib/embeddings";
import { selectDiverseChunks } from "@/lib/retrieval";
import { isSmallTalk } from "@/lib/small-talk";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RetrievedKnowledge } from "@/lib/types";

/** Partner files are a supplement to the shared library, so keep it tight. */
const MAX_PARTNER_CHUNKS = Number(process.env.PARTNER_RAG_MAX_CHUNKS ?? 4);
const CANDIDATE_MULTIPLIER = 4;
const MAX_CHUNKS_PER_FILE = Number(process.env.PARTNER_RAG_MAX_CHUNKS_PER_FILE ?? 2);
const SIMILARITY_THRESHOLD = Number(
  process.env.PARTNER_RAG_SIMILARITY_THRESHOLD ?? 0.35,
);
const MAX_CHUNK_CONTEXT_CHARS = 1200;

type PartnerVectorMatchRow = {
  id: string;
  file_id: string;
  filename: string;
  content: string;
  similarity: number;
  keyword_rank?: number | null;
  vector_rank?: number | null;
  fused_score?: number;
};

/**
 * Find the closest chunks from a partner's own uploaded files. Returns an empty
 * list when the partner has no files, so the shared path is unaffected.
 */
export async function findPartnerKnowledge(
  message: string,
  partnerId: string,
): Promise<RetrievedKnowledge[]> {
  if (!partnerId || isSmallTalk(message)) {
    return [];
  }

  try {
    const admin = createAdminClient();
    const queryEmbedding = await embedQuery(message);

    const { data, error } = await admin.rpc("match_partner_knowledge_chunks_hybrid", {
      query_embedding: queryEmbedding,
      p_partner_id: partnerId,
      query_text: message,
      match_count: MAX_PARTNER_CHUNKS * CANDIDATE_MULTIPLIER,
      similarity_threshold: SIMILARITY_THRESHOLD,
    });

    if (error) {
      throw new Error(error.message);
    }

    const rows = selectDiverseChunks(
      ((data ?? []) as PartnerVectorMatchRow[]).map((row) => ({
        ...row,
        // The diversity helper keys on `article_id`; for partner chunks the
        // equivalent grouping key is the source file.
        article_id: row.file_id,
      })),
      {
        maxChunks: MAX_PARTNER_CHUNKS,
        perArticle: MAX_CHUNKS_PER_FILE,
      },
    );

    return rows.map((row) => ({
      articleId: row.file_id,
      // Slug stays unique per source so dedupeSources doesn't collapse two
      // files that happen to share a name.
      slug: `partner:${row.file_id}`,
      title: row.filename,
      category: "partner",
      content: row.content.slice(0, MAX_CHUNK_CONTEXT_CHARS),
      similarity: row.vector_rank ? row.similarity : undefined,
    }));
  } catch {
    // A partner-KB failure must never break a chat answer.
    return [];
  }
}
