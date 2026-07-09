import { embedKnowledgeArticles } from "@/lib/embed-knowledge";
import { logError } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import type { KnowledgeArticle } from "@/lib/types";

const JOB_BATCH_SIZE = Number(process.env.EMBED_JOB_BATCH_SIZE ?? 5);

export type KnowledgeEmbedJob = {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  article_ids: string[];
  articles_total: number;
  articles_processed: number;
  chunks_written: number;
  error: string | null;
  created_at: string;
  updated_at: string;
};

export async function createEmbedJob(articleIds: string[], createdBy: string | null) {
  const admin = createAdminClient();
  const uniqueIds = [...new Set(articleIds)];

  const { data, error } = await admin
    .from("knowledge_embed_jobs")
    .insert({
      article_ids: uniqueIds,
      articles_total: uniqueIds.length,
      created_by: createdBy,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data.id as string;
}

export async function getEmbedJob(jobId: string): Promise<KnowledgeEmbedJob | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("knowledge_embed_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as KnowledgeEmbedJob | null) ?? null;
}

async function loadArticlesByIds(ids: string[]) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("knowledge_articles")
    .select("*")
    .in("id", ids);

  if (error) {
    throw new Error(error.message);
  }

  const byId = new Map((data as KnowledgeArticle[]).map((article) => [article.id, article]));
  return ids.map((id) => byId.get(id)).filter((article): article is KnowledgeArticle => Boolean(article));
}

export async function processEmbedJob(
  jobId: string,
  options: { maxArticles?: number } = {},
) {
  const admin = createAdminClient();
  const maxArticles = options.maxArticles ?? JOB_BATCH_SIZE;

  const { data: job, error: jobError } = await admin
    .from("knowledge_embed_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (jobError) {
    throw new Error(jobError.message);
  }

  if (!job || job.status === "completed" || job.status === "failed") {
    return job as KnowledgeEmbedJob | null;
  }

  await admin
    .from("knowledge_embed_jobs")
    .update({ status: "processing", error: null })
    .eq("id", jobId);

  const remainingIds = (job.article_ids as string[]).slice(job.articles_processed);
  const batchIds = remainingIds.slice(0, maxArticles);

  try {
    const articles = await loadArticlesByIds(batchIds);
    const embedResult = await embedKnowledgeArticles(articles);
    const articlesProcessed = job.articles_processed + batchIds.length;
    const chunksWritten = job.chunks_written + embedResult.chunksWritten;
    const isComplete = articlesProcessed >= job.articles_total;

    const { data: updated, error: updateError } = await admin
      .from("knowledge_embed_jobs")
      .update({
        status: isComplete ? "completed" : "processing",
        articles_processed: articlesProcessed,
        chunks_written: chunksWritten,
        error: null,
      })
      .eq("id", jobId)
      .select("*")
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    return updated as KnowledgeEmbedJob;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Embedding job failed.";
    logError("Knowledge embed job failed", error, { jobId });

    await admin
      .from("knowledge_embed_jobs")
      .update({ status: "failed", error: message })
      .eq("id", jobId);

    throw error;
  }
}

export async function processPendingEmbedJobs(limit = 1) {
  const admin = createAdminClient();
  const { data: jobs, error } = await admin
    .from("knowledge_embed_jobs")
    .select("id")
    .in("status", ["pending", "processing"])
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  const results = [];
  for (const job of jobs ?? []) {
    results.push(await processEmbedJob(job.id as string));
  }

  return results;
}

export async function runEmbedJobUntilComplete(jobId: string, maxRounds = 200) {
  let job = await getEmbedJob(jobId);

  for (let round = 0; round < maxRounds; round += 1) {
    if (!job || job.status === "completed" || job.status === "failed") {
      return job;
    }

    job = await processEmbedJob(jobId);
  }

  return job;
}
