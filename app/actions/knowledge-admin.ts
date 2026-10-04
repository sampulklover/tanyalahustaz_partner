"use server";

import { revalidatePath } from "next/cache";
import { embedAllKnowledgeArticles } from "@/lib/embed-knowledge";
import { requireKnowledgeEditor } from "@/lib/dashboard";
import { runOcrBatch } from "@/lib/ocr";
import { getActionTranslations } from "@/lib/i18n/actions";

type ActionResult = { error?: string; success?: string };

/** Rebuild embeddings for every published article (after a model change). */
export async function reembedAllKnowledge(): Promise<ActionResult> {
  const t = await getActionTranslations();
  const admin = await requireKnowledgeEditor();
  if (!admin) {
    return { error: t("actionErrors.editorAccessRequired") };
  }

  try {
    const result = await embedAllKnowledgeArticles();
    revalidatePath("/dashboard/knowledge/sources");
    return {
      success: t("actionErrors.reembedSuccess", {
        articles: result.articlesProcessed,
        chunks: result.chunksWritten,
        cost: `$${result.costUsd.toFixed(4)}`,
      }),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : t("actionErrors.reembedFailed"),
    };
  }
}

/**
 * OCR scanned PDFs that have no text layer. Capped per run to protect the
 * OpenRouter balance; the editor can click again for the next batch.
 */
export async function ocrPendingFiles(): Promise<ActionResult> {
  const t = await getActionTranslations();
  const admin = await requireKnowledgeEditor();
  if (!admin) {
    return { error: t("actionErrors.editorAccessRequired") };
  }

  try {
    const result = await runOcrBatch({
      maxFiles: Number(process.env.OCR_MAX_FILES ?? 5),
      createdBy: admin.userId,
    });

    revalidatePath("/dashboard/knowledge/sources");

    if (result.filesSeen === 0) {
      return { success: t("actionErrors.ocrNone") };
    }

    return {
      success: t("actionErrors.ocrSuccess", {
        processed: result.processed,
        failed: result.failed.length,
        cost: `$${result.costUsd.toFixed(4)}`,
      }),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : t("actionErrors.ocrFailed"),
    };
  }
}
