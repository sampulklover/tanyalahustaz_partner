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

/**
 * Insert this many chunk rows per request (vectors are large). Kept low by
 * default: writing hundreds of 1536-dim vectors at once burns Supabase's Disk IO
 * budget and risks statement timeouts. Raise via CHUNK_INSERT_BATCH_SIZE only if
 * your plan has headroom.
 */
const CHUNK_INSERT_BATCH_SIZE = Math.max(
  1,
  Number(process.env.CHUNK_INSERT_BATCH_SIZE ?? 100),
);
/** Pause between insert batches so writes don't spike Disk IO on small plans. */
const CHUNK_INSERT_PAUSE_MS = Math.max(
  0,
  Number(process.env.CHUNK_INSERT_PAUSE_MS ?? 100),
);

/**
 * How many articles to embed at once when embedding in bulk. Articles are
 * independent, so overlapping them hides both the extraction-to-embed latency
 * and the per-article DB writes. Kept modest by default; raise it (or set
 * EMBED_CONCURRENCY higher) for large backfills. Read per call.
 */
function embedArticleConcurrency() {
  return Math.max(1, Number(process.env.EMBED_ARTICLE_CONCURRENCY ?? 4));
}

/** Run tasks with a fixed max in flight, collecting results in input order. */
async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (next < items.length) {
        const index = next;
        next += 1;
        results[index] = await task(items[index], index);
      }
    },
  );

  await Promise.all(workers);
  return results;
}

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
  let failed = 0;

  // Embed several articles at once. A file that throws is logged and skipped so
  // the rest of the batch still lands.
  const results = await mapWithConcurrency(
    list,
    embedArticleConcurrency(),
    async (article, index) => {
      console.log(`[${index + 1}/${list.length}] ${article.title}`);
      try {
        return await embedKnowledgeArticle(article);
      } catch (error) {
        failed += 1;
        console.error(
          `[embed-knowledge] Failed article "${article.title}": ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        return { chunksWritten: 0, promptTokens: 0, costUsd: 0 };
      }
    },
  );

  for (const result of results) {
    chunksWritten += result.chunksWritten;
    promptTokens += result.promptTokens;
    costUsd += result.costUsd;
  }

  if (failed > 0) {
    console.warn(`[embed-knowledge] Skipped ${failed} article(s) after errors.`);
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

  // A chunk that failed to embed comes back as an empty array; drop it rather
  // than insert a row with a null vector (which would break search).
  const rows = chunks
    .map((content, chunkIndex) => ({
      article_id: article.id,
      chunk_index: chunkIndex,
      content,
      embedding: embeddings[chunkIndex],
    }))
    .filter((row) => Array.isArray(row.embedding) && row.embedding.length > 0);

  if (rows.length < chunks.length) {
    console.warn(
      `[embed-knowledge] ${chunks.length - rows.length} chunk(s) skipped for article ${article.id}.`,
    );
  }

  // Upsert on (article_id, chunk_index) instead of delete-then-insert. Embedding
  // now runs in parallel, so two runs of the same article could otherwise race:
  // both delete, both insert, and the unique index rejects the second. An upsert
  // is atomic and makes a re-embed idempotent. Transient pooler errors (timeouts,
  // fetch failed) are retried a couple of times before giving up.
  for (let index = 0; index < rows.length; index += CHUNK_INSERT_BATCH_SIZE) {
    const batch = rows.slice(index, index + CHUNK_INSERT_BATCH_SIZE);

    let lastError: string | null = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { error } = await admin
        .from("knowledge_chunks")
        .upsert(batch, { onConflict: "article_id,chunk_index" });

      if (!error) {
        lastError = null;
        break;
      }

      lastError = error.message;
      const transient =
        !error.message ||
        /timeout|fetch failed|schema cache|connection/i.test(error.message);
      if (!transient) break;

      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }

    if (lastError !== null) {
      throw new Error(lastError);
    }

    // Space out batches so a big article doesn't spike Disk IO in one burst.
    if (CHUNK_INSERT_PAUSE_MS > 0 && index + CHUNK_INSERT_BATCH_SIZE < rows.length) {
      await new Promise((resolve) => setTimeout(resolve, CHUNK_INSERT_PAUSE_MS));
    }
  }

  // A shorter re-embed leaves stale rows behind (chunk count shrank), so drop
  // any chunk_index beyond what we just wrote.
  await admin
    .from("knowledge_chunks")
    .delete()
    .eq("article_id", article.id)
    .gte("chunk_index", rows.length);

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
