import { embedText } from "@/lib/embeddings";
import { createAdminClient } from "@/lib/supabase/admin";
import type { KnowledgeArticle, KnowledgeSource, RetrievedKnowledge } from "@/lib/types";

const MAX_CONTEXT_CHUNKS = 6;
const KEYWORD_FALLBACK_LIMIT = 4;

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
    return "No specific knowledge articles matched. Answer carefully and recommend consulting a qualified local scholar for complex matters.";
  }

  return items
    .map((item, index) => {
      const similarity =
        typeof item.similarity === "number" ? ` | relevance ${(item.similarity * 100).toFixed(0)}%` : "";
      return `[Source ${index + 1}: ${item.title} (${item.category})${similarity}]\n${item.content}`;
    })
    .join("\n\n---\n\n");
}

type VectorMatchRow = {
  id: string;
  article_id: string;
  article_slug: string;
  article_title: string;
  category: string;
  content: string;
  similarity: number;
};

function normalizeCategory(category?: string) {
  const value = category?.trim();
  if (!value || value === "all") return null;
  return value;
}

async function vectorSearch(message: string, category?: string) {
  const admin = createAdminClient();
  const queryEmbedding = await embedText(message);
  const filterCategory = normalizeCategory(category);

  const { data, error } = await admin.rpc("match_knowledge_chunks", {
    query_embedding: queryEmbedding,
    match_count: MAX_CONTEXT_CHUNKS,
    filter_category: filterCategory,
    similarity_threshold: 0.25,
  });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as VectorMatchRow[]).map((row) => ({
    articleId: row.article_id,
    slug: row.article_slug,
    title: row.article_title,
    category: row.category,
    content: row.content,
    similarity: row.similarity,
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
    content: `${article.summary}\n\n${article.content}`,
  }));
}

async function hasEmbeddedChunks() {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("knowledge_chunks")
    .select("*", { count: "exact", head: true })
    .not("embedding", "is", null);

  if (error) {
    return false;
  }

  return (count ?? 0) > 0;
}

export async function findRelevantKnowledge(message: string, category?: string) {
  try {
    const chunksAvailable = await hasEmbeddedChunks();

    if (chunksAvailable) {
      const vectorResults = await vectorSearch(message, category);
      if (vectorResults.length > 0) {
        return vectorResults;
      }
    }
  } catch {
    // Fall back to keyword search if embeddings or vector query fail.
  }

  return keywordFallback(message, category);
}
