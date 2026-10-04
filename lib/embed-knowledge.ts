import { chunkArticleText } from "@/lib/chunking";
import { embedTexts, getEmbeddingModelId } from "@/lib/embeddings";
import { createAdminClient } from "@/lib/supabase/admin";
import type { KnowledgeArticle } from "@/lib/types";

export type EmbedKnowledgeResult = {
  articlesProcessed: number;
  chunksWritten: number;
  promptTokens: number;
  costUsd: number;
};

/** Insert this many chunk rows per request (vectors are large). */
const CHUNK_INSERT_BATCH_SIZE = Math.max(
  1,
  Number(process.env.CHUNK_INSERT_BATCH_SIZE ?? 200),
);

export async function embedKnowledgeArticles(
  articles: KnowledgeArticle[],
): Promise<EmbedKnowledgeResult> {
  let chunksWritten = 0;
  let promptTokens = 0;
  let costUsd = 0;

  for (const article of articles) {
    if (!article.published) {
      await removeArticleEmbeddings(article.id);
      continue;
    }
    const result = await embedKnowledgeArticle(article);
    chunksWritten += result.chunksWritten;
    promptTokens += result.promptTokens;
    costUsd += result.costUsd;
  }

  return {
    articlesProcessed: articles.length,
    chunksWritten,
    promptTokens,
    costUsd,
  };
}

export async function embedAllKnowledgeArticles(
  options: { limit?: number } = {},
): Promise<EmbedKnowledgeResult> {
  const admin = createAdminClient();

  let query = admin
    .from("knowledge_articles")
    .select("*")
    .eq("published", true)
    .order("title", { ascending: true });

  if (options.limit && options.limit > 0) {
    query = query.limit(options.limit);
  }

  const { data: articles, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const list = (articles ?? []) as KnowledgeArticle[];
  let chunksWritten = 0;
  let promptTokens = 0;
  let costUsd = 0;

  for (let index = 0; index < list.length; index += 1) {
    const article = list[index];
    console.log(`[${index + 1}/${list.length}] ${article.title}`);

    const result = await embedKnowledgeArticle(article);
    chunksWritten += result.chunksWritten;
    promptTokens += result.promptTokens;
    costUsd += result.costUsd;
  }

  return {
    articlesProcessed: list.length,
    chunksWritten,
    promptTokens,
    costUsd,
  };
}

export async function removeArticleEmbeddings(articleId: string) {
  const admin = createAdminClient();
  await admin.from("knowledge_chunks").delete().eq("article_id", articleId);
}

/** Total chunk rows currently stored (used to report re-embed progress). */
export async function countKnowledgeChunks(): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("knowledge_chunks")
    .select("id", { count: "exact", head: true });

  return count ?? 0;
}

export async function syncArticleEmbeddings(article: KnowledgeArticle) {
  if (article.published) {
    return embedKnowledgeArticle(article);
  }
  await removeArticleEmbeddings(article.id);
  return { chunksWritten: 0, promptTokens: 0, costUsd: 0 };
}

export type EmbedArticleResult = {
  chunksWritten: number;
  promptTokens: number;
  costUsd: number;
};

export async function embedKnowledgeArticle(
  article: KnowledgeArticle,
): Promise<EmbedArticleResult> {
  const admin = createAdminClient();
  const chunks = chunkArticleText({
    title: article.title,
    summary: article.summary,
    content: article.content,
  });

  const { embeddings, usage } = await embedTexts(chunks);

  await admin.from("knowledge_chunks").delete().eq("article_id", article.id);

  const rows = chunks.map((content, chunkIndex) => ({
    article_id: article.id,
    article_slug: article.slug,
    article_title: article.title,
    category: article.category,
    chunk_index: chunkIndex,
    content,
    embedding: embeddings[chunkIndex],
  }));

  for (let index = 0; index < rows.length; index += CHUNK_INSERT_BATCH_SIZE) {
    const { error } = await admin
      .from("knowledge_chunks")
      .insert(rows.slice(index, index + CHUNK_INSERT_BATCH_SIZE));

    if (error) {
      throw new Error(error.message);
    }
  }

  // Record what this file cost to make searchable.
  await admin
    .from("knowledge_articles")
    .update({
      embed_cost_usd: usage.costUsd,
      embed_prompt_tokens: usage.promptTokens,
      embed_chunks: rows.length,
      embed_model: getEmbeddingModelId(),
      embed_updated_at: new Date().toISOString(),
    })
    .eq("id", article.id);

  return {
    chunksWritten: rows.length,
    promptTokens: usage.promptTokens,
    costUsd: usage.costUsd,
  };
}
