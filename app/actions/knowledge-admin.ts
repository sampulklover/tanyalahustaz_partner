"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  embedAllKnowledgeArticles,
  removeArticleEmbeddings,
  syncArticleEmbeddings,
} from "@/lib/embed-knowledge";
import { parseTagsInput, slugify } from "@/lib/knowledge-form";
import { requireKnowledgeEditor } from "@/lib/dashboard";
import { createClient } from "@/lib/supabase/server";
import type { KnowledgeArticle } from "@/lib/types";

type ActionResult = { error?: string; success?: string };

function parseArticleForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim() || slugify(title);
  const category = String(formData.get("category") ?? "general").trim() || "general";
  const summary = String(formData.get("summary") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const tags = parseTagsInput(String(formData.get("tags") ?? ""));
  const published = formData.get("published") === "on";

  if (!title || title.length < 3) {
    return { error: "Title is required (min 3 characters)." } as const;
  }
  if (!slug || slug.length < 3) {
    return { error: "Slug is required (min 3 characters)." } as const;
  }
  if (!summary || summary.length < 10) {
    return { error: "Summary is required (min 10 characters)." } as const;
  }
  if (!content || content.length < 20) {
    return { error: "Content is required (min 20 characters)." } as const;
  }

  return {
    data: { title, slug, category, summary, content, tags, published },
  } as const;
}

export async function createKnowledgeArticle(formData: FormData): Promise<ActionResult> {
  const admin = await requireKnowledgeEditor();
  if (!admin) {
    return { error: "Editor access required." };
  }

  const parsed = parseArticleForm(formData);
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
  const admin = await requireKnowledgeEditor();
  if (!admin) {
    return { error: "Editor access required." };
  }

  const parsed = parseArticleForm(formData);
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
  const admin = await requireKnowledgeEditor();
  if (!admin) {
    return { error: "Editor access required." };
  }

  try {
    const result = await embedAllKnowledgeArticles();
    revalidatePath("/dashboard/knowledge");
    return {
      success: `Re-embedded ${result.articlesProcessed} article(s), ${result.chunksWritten} chunk(s).`,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Re-embed failed.",
    };
  }
}
