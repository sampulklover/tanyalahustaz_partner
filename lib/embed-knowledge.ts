import { chunkArticleText } from "@/lib/chunking";
import { embedTexts } from "@/lib/embeddings";
import { createAdminClient } from "@/lib/supabase/admin";
import type { KnowledgeArticle } from "@/lib/types";

export type EmbedKnowledgeResult = {
  articlesProcessed: number;
  chunksWritten: number;
};

export async function embedKnowledgeArticles(
  articles: KnowledgeArticle[],
): Promise<{ articlesProcessed: number; chunksWritten: number }> {
  let chunksWritten = 0;

  for (const article of articles) {
    if (!article.published) {
      await removeArticleEmbeddings(article.id);
      continue;
    }
    chunksWritten += await embedKnowledgeArticle(article);
  }

  return {
    articlesProcessed: articles.length,
    chunksWritten,
  };
}

export async function embedAllKnowledgeArticles(): Promise<EmbedKnowledgeResult> {
  const admin = createAdminClient();

  const { data: articles, error } = await admin
    .from("knowledge_articles")
    .select("*")
    .eq("published", true)
    .order("title", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  let chunksWritten = 0;

  for (const article of (articles ?? []) as KnowledgeArticle[]) {
    const written = await embedKnowledgeArticle(article);
    chunksWritten += written;
  }

  return {
    articlesProcessed: articles?.length ?? 0,
    chunksWritten,
  };
}

export async function removeArticleEmbeddings(articleId: string) {
  const admin = createAdminClient();
  await admin.from("knowledge_chunks").delete().eq("article_id", articleId);
}

export async function syncArticleEmbeddings(article: KnowledgeArticle) {
  if (article.published) {
    return embedKnowledgeArticle(article);
  }
  await removeArticleEmbeddings(article.id);
  return 0;
}

export async function embedKnowledgeArticle(article: KnowledgeArticle) {
  const admin = createAdminClient();
  const chunks = chunkArticleText({
    title: article.title,
    summary: article.summary,
    content: article.content,
  });

  const embeddings = await embedTexts(chunks);

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

  const { error } = await admin.from("knowledge_chunks").insert(rows);

  if (error) {
    throw new Error(error.message);
  }

  return rows.length;
}
