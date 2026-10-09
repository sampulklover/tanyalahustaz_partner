import { embedQuery } from "@/lib/embeddings";
import { expandQuery } from "@/lib/query-expansion";
import { NO_KNOWLEDGE_CONTEXT } from "@/lib/rag-context";
import { selectDiverseChunks } from "@/lib/retrieval";
import { isSmallTalk } from "@/lib/small-talk";
import { createAdminClient } from "@/lib/supabase/admin";
import type { KnowledgeArticle, KnowledgeSource, RetrievedKnowledge } from "@/lib/types";

// Retrieval breadth. With a large corpus (800k+ chunks) a handful of candidates
// is not enough: generic matches ("hukum minum X") crowd out the topical ones.
// Pull more candidates so the diverse picker has room to find the right article.
const MAX_CONTEXT_CHUNKS = Number(process.env.RAG_MAX_CONTEXT_CHUNKS ?? 10);
const KEYWORD_FALLBACK_LIMIT = 4;
/** Fetch extra candidates so one article can't monopolise the results. */
const CANDIDATE_MULTIPLIER = Number(process.env.RAG_CANDIDATE_MULTIPLIER ?? 8);
/** At most this many chunks from a single article. */
const MAX_CHUNKS_PER_ARTICLE = Number(process.env.RAG_MAX_CHUNKS_PER_ARTICLE ?? 2);
/** Chunks weaker than this are not used (avoids citing unrelated content). */
const SIMILARITY_THRESHOLD = Number(process.env.RAG_SIMILARITY_THRESHOLD ?? 0.35);
/** Hard caps so one huge document can never blow up the prompt (and the bill). */
const MAX_CHUNK_CONTEXT_CHARS = 1200;
const MAX_TOTAL_CONTEXT_CHARS = 12000;

export function toKnowledgeSource(item: RetrievedKnowledge): KnowledgeSource {
  return {
    slug: item.slug,
    title: item.title,
    category: item.category,
  };
}

export function dedupeSources(items: RetrievedKnowledge[]): KnowledgeSource[] {
  const seen = new Set<string>();
  const sources: KnowledgeSource[] = [];

  for (const item of items) {
    if (seen.has(item.slug)) continue;
    seen.add(item.slug);
    sources.push(toKnowledgeSource(item));
  }

  return sources;
}

export function buildKnowledgeContext(items: RetrievedKnowledge[]) {
  if (items.length === 0) {
    return NO_KNOWLEDGE_CONTEXT;
  }

  return items
    .map((item, index) => {
      const similarity =
        typeof item.similarity === "number" ? ` | relevance ${(item.similarity * 100).toFixed(0)}%` : "";
      const content = item.content.slice(0, MAX_CHUNK_CONTEXT_CHARS);
      return `[Source ${index + 1}: ${item.title} (${item.category})${similarity}]\n${content}`;
    })
    .join("\n\n---\n\n")
    .slice(0, MAX_TOTAL_CONTEXT_CHARS);
}

type VectorMatchRow = {
  id: string;
  article_id: string;
  article_slug: string;
  article_title: string;
  category: string;
  content: string;
  similarity: number;
  keyword_rank?: number | null;
  vector_rank?: number | null;
  fused_score?: number;
};

function normalizeCategory(category?: string) {
  const value = category?.trim();
  if (!value || value === "all") return null;
  return value;
}

async function hybridSearch(message: string, category?: string) {
  const admin = createAdminClient();
  // Expand the query with topical synonyms so the embedding and the keyword
  // branch can find the right material, not just the same phrasing.
  const expanded = expandQuery(message);
  const queryEmbedding = await embedQuery(expanded);
  const filterCategory = normalizeCategory(category);

  const { data, error } = await admin.rpc("match_knowledge_chunks_hybrid", {
    query_embedding: queryEmbedding,
    query_text: expanded,
    match_count: MAX_CONTEXT_CHUNKS * CANDIDATE_MULTIPLIER,
    filter_category: filterCategory,
    similarity_threshold: SIMILARITY_THRESHOLD,
  });

  if (error) {
    throw new Error(error.message);
  }

  const rows = selectDiverseChunks((data ?? []) as VectorMatchRow[], {
    maxChunks: MAX_CONTEXT_CHUNKS,
    perArticle: MAX_CHUNKS_PER_ARTICLE,
  });

  return rows.map((row) => ({
    articleId: row.article_id,
    slug: row.article_slug,
    title: row.article_title,
    category: row.category,
    content: row.content.slice(0, MAX_CHUNK_CONTEXT_CHARS),
    // Keep the presentation clean: literal-only hits have no vector similarity.
    similarity: row.vector_rank ? row.similarity : undefined,
  }));
}

async function keywordFallback(message: string, category?: string) {
  const admin = createAdminClient();
  const searchTerms = message
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .slice(0, 6);

  let query = admin
    .from("knowledge_articles")
    .select("*")
    .eq("published", true)
    .order("updated_at", { ascending: false })
    .limit(KEYWORD_FALLBACK_LIMIT);

  const filterCategory = normalizeCategory(category);
  if (filterCategory) {
    query = query.eq("category", filterCategory);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  let articles = (data ?? []) as KnowledgeArticle[];

  if (searchTerms.length > 0 && !filterCategory) {
    const scored = articles
      .map((article) => {
        const haystack =
          `${article.title} ${article.summary} ${article.content} ${article.tags.join(" ")}`.toLowerCase();
        const score = searchTerms.reduce(
          (total, term) => total + (haystack.includes(term) ? 1 : 0),
          0,
        );
        return { article, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.article);

    if (scored.length > 0) {
      articles = scored.slice(0, KEYWORD_FALLBACK_LIMIT);
    }
  }

  return articles.map((article) => ({
    articleId: article.id,
    slug: article.slug,
    title: article.title,
    category: article.category,
    // Never inject a full article here — a single e-book could be megabytes.
    content: `${article.summary}\n\n${article.content}`.slice(0, MAX_CHUNK_CONTEXT_CHARS),
  }));
}

async function hasEmbeddedChunks() {
  const admin = createAdminClient();
  // A single row is enough to know embeddings exist and is far cheaper than an
  // exact count over the whole (tens of thousands of rows) chunk table.
  const { data, error } = await admin
    .from("knowledge_chunks")
    .select("id")
    .not("embedding", "is", null)
    .limit(1);

  if (error) {
    return false;
  }

  return (data ?? []).length > 0;
}

export async function findRelevantKnowledge(message: string, category?: string) {
  // Greetings and one-word chatter should not pull (or cite) random articles.
  if (isSmallTalk(message)) {
    return [];
  }

  try {
    const chunksAvailable = await hasEmbeddedChunks();

    if (chunksAvailable) {
      // Hybrid retrieval: vector similarity + full-text, fused in the database.
      return await hybridSearch(message, category);
    }
  } catch {
    // Embeddings unavailable — fall through to keyword search.
  }

  return keywordFallback(message, category);
}
