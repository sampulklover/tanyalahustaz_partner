// Partner-owned knowledge base: ingestion (upload -> text -> chunks -> vectors)
// and lifecycle (list / delete).
//
// This mirrors the global knowledge embedding pipeline (lib/embed-knowledge.ts)
// but is scoped to one partner. Retrieval of these chunks lives in
// lib/partner-knowledge-search.ts; the shared retrieval path stays untouched so
// one partner's files can never surface in another partner's answers.

import { computeChargeCents, getUsdMyrRate } from "@/lib/billing";
import { getMarkupPercent } from "@/lib/billing-settings";
import { chunkArticleText } from "@/lib/chunking";
import { recordUsageCharge } from "@/lib/credit";
import { embedTexts, getEmbeddingModelId } from "@/lib/embeddings";
import { extractDocumentText } from "@/lib/knowledge-extract";
import { createAdminClient } from "@/lib/supabase/admin";

/** Cap on the extracted text we keep/embed per file, so one upload can't run away. */
const MAX_EXTRACTED_CHARS = 400_000;

/** How much of the extracted text to keep for display. Not used for retrieval. */
const PREVIEW_CHARS = 500;

/** Insert this many chunk rows per request (vectors are large). */
const CHUNK_INSERT_BATCH_SIZE = Math.max(
  1,
  Number(process.env.CHUNK_INSERT_BATCH_SIZE ?? 200),
);

export type PartnerKnowledgeFile = {
  id: string;
  partner_id: string;
  filename: string;
  file_type: string;
  mime_type: string | null;
  size_bytes: number;
  status: "processing" | "ready" | "failed";
  error: string | null;
  preview: string | null;
  chunk_count: number;
  embed_model: string | null;
  embed_prompt_tokens: number;
  embed_cost_usd: number;
  charged_cents: number;
  created_at: string;
  updated_at: string;
};

export type IngestPartnerFileInput = {
  partnerId: string;
  filename: string;
  mimeType?: string | null;
  buffer: Buffer;
};

export type IngestPartnerFileResult = {
  fileId: string;
  chunkCount: number;
  chargedCents: number;
};

/** Best-effort extension label for display. */
function fileTypeFromName(filename: string): string {
  const match = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : "text";
}

export async function listPartnerKnowledgeFiles(
  partnerId: string,
): Promise<PartnerKnowledgeFile[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("partner_knowledge_files")
    .select("*")
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as PartnerKnowledgeFile[];
}

/**
 * Ingest one uploaded document for a partner.
 *
 * Steps: insert a 'processing' row -> extract text -> chunk -> embed -> store
 * chunks -> mark 'ready' and bill the embedding cost. On any failure the row is
 * marked 'failed' with the reason so the partner can see what happened and
 * delete/retry.
 */
export async function ingestPartnerKnowledgeFile({
  partnerId,
  filename,
  mimeType,
  buffer,
}: IngestPartnerFileInput): Promise<IngestPartnerFileResult> {
  const admin = createAdminClient();

  const { data: inserted, error: insertError } = await admin
    .from("partner_knowledge_files")
    .insert({
      partner_id: partnerId,
      filename,
      file_type: fileTypeFromName(filename),
      mime_type: mimeType ?? null,
      size_bytes: buffer.byteLength,
      status: "processing",
    })
    .select("id")
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  const fileId = inserted.id as string;

  try {
    const extracted = await extractDocumentText(filename, buffer);
    const content = extracted.slice(0, MAX_EXTRACTED_CHARS);

    if (!content.trim()) {
      throw new Error("No readable text was found in this file.");
    }

    const chunks = chunkArticleText({
      title: filename,
      summary: "",
      content,
    });

    const { embeddings, usage } = await embedTexts(chunks);

    // Replace any earlier chunks for this file (safe on retry).
    await admin.from("partner_knowledge_chunks").delete().eq("file_id", fileId);

    const rows = chunks.map((chunkContent, chunkIndex) => ({
      partner_id: partnerId,
      file_id: fileId,
      filename,
      chunk_index: chunkIndex,
      content: chunkContent,
      embedding: embeddings[chunkIndex],
    }));

    for (let index = 0; index < rows.length; index += CHUNK_INSERT_BATCH_SIZE) {
      const { error } = await admin
        .from("partner_knowledge_chunks")
        .insert(rows.slice(index, index + CHUNK_INSERT_BATCH_SIZE));

      if (error) {
        throw new Error(error.message);
      }
    }

    // Bill the embedding cost to the partner, using the same markup and
    // USD/MYR rate as chat usage so pricing is consistent.
    let chargedCents = 0;
    if (usage.costUsd > 0) {
      const markupPercent = await getMarkupPercent();
      const usdMyrRate = getUsdMyrRate();
      chargedCents = computeChargeCents(usage.costUsd, markupPercent, usdMyrRate);

      if (chargedCents > 0) {
        await recordUsageCharge({
          userId: partnerId,
          chargedCents,
          logId: fileId,
          reason: "embedding",
        });
      }
    }

    await admin
      .from("partner_knowledge_files")
      .update({
        status: "ready",
        error: null,
        // Only a short excerpt is kept — the full text lives in the chunks.
        preview: content.slice(0, PREVIEW_CHARS),
        chunk_count: rows.length,
        embed_model: getEmbeddingModelId(),
        embed_prompt_tokens: usage.promptTokens,
        embed_cost_usd: usage.costUsd,
        charged_cents: chargedCents,
        updated_at: new Date().toISOString(),
      })
      .eq("id", fileId);

    return { fileId, chunkCount: rows.length, chargedCents };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to process this file.";

    await admin
      .from("partner_knowledge_files")
      .update({
        status: "failed",
        error: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", fileId);

    throw new Error(message);
  }
}

/** Delete a partner's file and its chunks (chunks cascade on file delete). */
export async function deletePartnerKnowledgeFile(
  partnerId: string,
  fileId: string,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("partner_knowledge_files")
    .delete()
    .eq("id", fileId)
    .eq("partner_id", partnerId);

  if (error) {
    throw new Error(error.message);
  }
}
