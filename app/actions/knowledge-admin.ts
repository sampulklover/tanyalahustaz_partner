"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  embedAllKnowledgeArticles,
  removeArticleEmbeddings,
  syncArticleEmbeddings,
} from "@/lib/embed-knowledge";
import { createEmbedJob, getEmbedJob, processEmbedJob } from "@/lib/knowledge-embed-jobs";
import {
  makeUniqueSlug,
  type BulkImportOptions,
  type BulkImportResult,
  type KnowledgeImportRow,
} from "@/lib/knowledge-import";
import { logError } from "@/lib/logger";
import { getActionTranslations } from "@/lib/i18n/actions";
import type { Translator } from "@/lib/i18n/translator";
import { parseTagsInput, slugify } from "@/lib/knowledge-form";
import { requireKnowledgeEditor } from "@/lib/dashboard";
import { createClient } from "@/lib/supabase/server";
import type { KnowledgeArticle } from "@/lib/types";

type ActionResult = { error?: string; success?: string };

function parseArticleForm(formData: FormData, t: Translator) {
  const title = String(formData.get("title") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim() || slugify(title);
  const category = String(formData.get("category") ?? "general").trim() || "general";
  const summary = String(formData.get("summary") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const tags = parseTagsInput(String(formData.get("tags") ?? ""));
  const published = formData.get("published") === "on";

  if (!title || title.length < 3) {
    return { error: t("actionErrors.titleRequired") } as const;
  }
  if (!slug || slug.length < 3) {
    return { error: t("actionErrors.slugRequired") } as const;
  }
  if (!summary || summary.length < 10) {
    return { error: t("actionErrors.summaryRequired") } as const;
  }
  if (!content || content.length < 20) {
    return { error: t("actionErrors.contentRequired") } as const;
  }

  return {
    data: { title, slug, category, summary, content, tags, published },
  } as const;
}

export async function createKnowledgeArticle(formData: FormData): Promise<ActionResult> {
  const t = await getActionTranslations();
  const admin = await requireKnowledgeEditor();
  if (!admin) {
    return { error: t("actionErrors.editorAccessRequired") };
  }

  const parsed = parseArticleForm(formData, t);
  if ("error" in parsed) {
    return { error: parsed.error };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("knowledge_articles")
    .insert(parsed.data)
    .select("*")
    .single();

  if (error) {
    return { error: error.message };
  }

  const article = data as KnowledgeArticle;

  try {
    const chunks = await syncArticleEmbeddings(article);
    revalidatePath("/dashboard/knowledge");
    redirect(
      `/dashboard/knowledge?saved=1${article.published ? `&embedded=${chunks}` : ""}`,
    );
  } catch (embedError) {
    return {
      error:
        embedError instanceof Error
          ? `Article saved but embedding failed: ${embedError.message}`
          : "Article saved but embedding failed.",
    };
  }
}

export async function updateKnowledgeArticle(
  articleId: string,
  formData: FormData,
): Promise<ActionResult> {
  const t = await getActionTranslations();
  const admin = await requireKnowledgeEditor();
  if (!admin) {
    return { error: t("actionErrors.editorAccessRequired") };
  }

  const parsed = parseArticleForm(formData, t);
  if ("error" in parsed) {
    return { error: parsed.error };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("knowledge_articles")
    .update(parsed.data)
    .eq("id", articleId)
    .select("*")
    .single();

  if (error) {
    return { error: error.message };
  }

  const article = data as KnowledgeArticle;

  try {
    await syncArticleEmbeddings(article);
    revalidatePath("/dashboard/knowledge");
    revalidatePath(`/dashboard/knowledge/${articleId}/edit`);
    return { success: article.published ? "Saved and re-embedded for AI search." : "Saved." };
  } catch (embedError) {
    return {
      error:
        embedError instanceof Error
          ? `Article saved but embedding failed: ${embedError.message}`
          : "Article saved but embedding failed.",
    };
  }
}

export async function deleteKnowledgeArticle(articleId: string): Promise<void> {
  const admin = await requireKnowledgeEditor();
  if (!admin) {
    throw new Error("Editor access required.");
  }

  await removeArticleEmbeddings(articleId);

  const supabase = await createClient();
  const { error } = await supabase.from("knowledge_articles").delete().eq("id", articleId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/knowledge");
  redirect("/dashboard/knowledge?deleted=1");
}

export async function reembedAllKnowledge(): Promise<ActionResult> {
  const t = await getActionTranslations();
  const admin = await requireKnowledgeEditor();
  if (!admin) {
    return { error: t("actionErrors.editorAccessRequired") };
  }

  try {
    const result = await embedAllKnowledgeArticles();
    revalidatePath("/dashboard/knowledge");
    return {
      success: `Re-embedded ${result.articlesProcessed} article(s), ${result.chunksWritten} chunk(s).`,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : t("actionErrors.reembedFailed"),
    };
  }
}

export async function bulkImportKnowledgeArticles(
  rows: KnowledgeImportRow[],
  options: BulkImportOptions,
): Promise<{ error?: string; result?: BulkImportResult }> {
  const t = await getActionTranslations();
  const admin = await requireKnowledgeEditor();
  if (!admin) {
    return { error: t("actionErrors.editorAccessRequired") };
  }

  if (!rows.length) {
    return { error: t("actionErrors.noValidArticles") };
  }

  if (rows.length > 500) {
    return { error: t("actionErrors.importMaxExceeded") };
  }

  const supabase = await createClient();
  const { data: existingArticles, error: existingError } = await supabase
    .from("knowledge_articles")
    .select("id, slug");

  if (existingError) {
    return { error: existingError.message };
  }

  const existingBySlug = new Map(
    (existingArticles ?? []).map((article) => [article.slug as string, article.id as string]),
  );
  const usedSlugs = new Set(existingBySlug.keys());

  const result: BulkImportResult = {
    imported: 0,
    updated: 0,
    skipped: 0,
    failed: [],
    embedded: 0,
    chunksWritten: 0,
  };

  const articlesToEmbed: KnowledgeArticle[] = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const existingId = existingBySlug.get(row.slug);

    if (existingId) {
      if (options.duplicateStrategy === "skip") {
        result.skipped += 1;
        continue;
      }

      const { data, error } = await supabase
        .from("knowledge_articles")
        .update({
          title: row.title,
          category: row.category,
          summary: row.summary,
          content: row.content,
          tags: row.tags,
          published: row.published,
        })
        .eq("id", existingId)
        .select("*")
        .single();

      if (error) {
        result.failed.push({
          index: index + 1,
          title: row.title,
          error: error.message,
        });
        continue;
      }

      result.updated += 1;
      articlesToEmbed.push(data as KnowledgeArticle);
      continue;
    }

    const slug = makeUniqueSlug(row.slug, usedSlugs);
    const payload = { ...row, slug };

    const { data, error } = await supabase
      .from("knowledge_articles")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      result.failed.push({
        index: index + 1,
        title: row.title,
        error: error.message,
      });
      continue;
    }

    const article = data as KnowledgeArticle;
    existingBySlug.set(article.slug, article.id);
    result.imported += 1;
    articlesToEmbed.push(article);
  }

  if (options.embedAfterImport && articlesToEmbed.length > 0) {
    const publishedArticles = articlesToEmbed.filter((article) => article.published);

    if (publishedArticles.length > 0) {
      try {
        const jobId = await createEmbedJob(
          publishedArticles.map((article) => article.id),
          admin.userId,
        );
        result.embedJobId = jobId;
        result.embedQueued = true;

        after(async () => {
          try {
            await processEmbedJob(jobId);
          } catch (error) {
            logError("Initial embed job batch failed", error, { jobId });
          }
        });
      } catch (error) {
        return {
          error:
            error instanceof Error
              ? `Import completed but embedding queue failed: ${error.message}`
              : "Import completed but embedding queue failed.",
          result,
        };
      }
    }
  }

  revalidatePath("/dashboard/knowledge");
  return { result };
}

export async function getKnowledgeEmbedJobStatus(jobId: string) {
  const t = await getActionTranslations();
  const admin = await requireKnowledgeEditor();
  if (!admin) {
    return { error: t("actionErrors.editorAccessRequired") };
  }

  const job = await getEmbedJob(jobId);
  if (!job) {
    return { error: t("actionErrors.embedJobNotFound") };
  }

  return { job };
}
