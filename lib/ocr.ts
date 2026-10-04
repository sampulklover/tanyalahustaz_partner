// OCR for scanned PDFs using an OpenRouter vision model.
//
// Scanned documents have no text layer, so `unpdf`'s text extraction returns
// almost nothing. Here we rasterise each page with @napi-rs/canvas and ask a
// vision model to transcribe it. This is opt-in and editor-triggered because it
// costs money and is far slower than normal extraction.

import { cleanExtractedText } from "@/lib/knowledge-extract";
import { downloadGcsObject } from "@/lib/gcs";
import { createEmbedJob } from "@/lib/knowledge-embed-jobs";
import { listOcrPending } from "@/lib/ocr-queue";
import { logError } from "@/lib/logger";
import {
  buildOpenRouterHeaders,
  getOpenRouterApiKey,
  mapOpenRouterError,
} from "@/lib/openrouter";
import { createAdminClient } from "@/lib/supabase/admin";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/** Vision model used for transcription. Override with OCR_MODEL. */
export const DEFAULT_OCR_MODEL = "google/gemini-2.5-flash";

/** Render scale for page images — higher is more accurate but costs more. */
const OCR_RENDER_SCALE = Number(process.env.OCR_RENDER_SCALE ?? 2.0);

/** Cap pages per file so one huge scan can't burn the whole budget. */
const OCR_MAX_PAGES = Number(process.env.OCR_MAX_PAGES ?? 50);

export function getOcrModel() {
  return process.env.OCR_MODEL?.trim() || DEFAULT_OCR_MODEL;
}

export function isOcrConfigured() {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

export type OcrUsage = {
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
};

export type OcrResult = {
  text: string;
  pagesProcessed: number;
  usage: OcrUsage;
  model: string;
};

const SYSTEM_PROMPT = `You transcribe scanned document pages into plain text.

Rules:
- Output ONLY the text visible on the page, in reading order.
- Preserve the original language, including Arabic script. Do not translate.
- Keep paragraph breaks. Do not add commentary, headings you cannot see, or markdown fences.
- If the page has no legible text, output nothing.`;

async function renderPageToDataUrl(
  pdf: Awaited<ReturnType<typeof import("unpdf")["getDocumentProxy"]>>,
  pageNumber: number,
): Promise<string> {
  const { renderPageAsImage } = await import("unpdf");
  return renderPageAsImage(pdf, pageNumber, {
    scale: OCR_RENDER_SCALE,
    toDataURL: true,
    canvasImport: () => import("@napi-rs/canvas"),
  });
}

function normalizeUsage(raw: unknown): OcrUsage {
  if (!raw || typeof raw !== "object") {
    return { promptTokens: 0, completionTokens: 0, costUsd: 0 };
  }
  const usage = raw as {
    prompt_tokens?: number;
    completion_tokens?: number;
    cost?: number;
  };
  return {
    promptTokens: Number(usage.prompt_tokens) || 0,
    completionTokens: Number(usage.completion_tokens) || 0,
    costUsd: Number(usage.cost) || 0,
  };
}

/** Transcribe a single rendered page image. */
async function transcribeImage(dataUrl: string): Promise<{ text: string; usage: OcrUsage }> {
  const apiKey = getOpenRouterApiKey();
  const model = getOcrModel();

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: buildOpenRouterHeaders(apiKey),
    body: JSON.stringify({
      model,
      temperature: 0,
      // Transcription needs no reasoning; disabling it is faster and cheaper.
      reasoning: { enabled: false },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Transcribe this page. Output only the text.",
            },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    mapOpenRouterError(response.status, errorBody);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: unknown;
  };

  const text = payload.choices?.[0]?.message?.content?.trim() ?? "";
  return { text, usage: normalizeUsage(payload.usage) };
}

/**
 * OCR a scanned PDF: render each page, transcribe it, and concatenate the
 * results. Throws when the model returns nothing usable.
 */
export async function ocrPdf(
  buffer: Buffer,
  options: { maxPages?: number } = {},
): Promise<OcrResult> {
  const { getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const totalPages = Math.min(pdf.numPages, options.maxPages ?? OCR_MAX_PAGES);
  const model = getOcrModel();

  const pages: string[] = [];
  const usage: OcrUsage = { promptTokens: 0, completionTokens: 0, costUsd: 0 };

  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    try {
      const dataUrl = await renderPageToDataUrl(pdf, pageNumber);
      const result = await transcribeImage(dataUrl);
      usage.promptTokens += result.usage.promptTokens;
      usage.completionTokens += result.usage.completionTokens;
      usage.costUsd += result.usage.costUsd;
      if (result.text) pages.push(result.text);
    } catch (error) {
      logError("OCR page failed", error, { pageNumber });
    }
  }

  const text = cleanExtractedText(pages.join("\n\n"));

  if (text.length < 20) {
    throw new Error("OCR found no readable text on this file.");
  }

  return { text, pagesProcessed: totalPages, usage, model };
}

export type OcrRunResult = {
  filesSeen: number;
  processed: number;
  failed: { path: string; error: string }[];
  costUsd: number;
  promptTokens: number;
  completionTokens: number;
};

/**
 * OCR up to `maxFiles` pending articles, writing the transcribed text back onto
 * each article and clearing the flag. Caps work per call to protect the balance.
 */
export async function runOcrBatch(
  options: { maxFiles?: number; createdBy?: string | null } = {},
): Promise<OcrRunResult> {
  const admin = createAdminClient();
  const maxFiles = options.maxFiles ?? Number(process.env.OCR_MAX_FILES ?? 5);

  const pending = await listOcrPending(maxFiles);
  const result: OcrRunResult = {
    filesSeen: pending.length,
    processed: 0,
    failed: [],
    costUsd: 0,
    promptTokens: 0,
    completionTokens: 0,
  };

  if (pending.length === 0) return result;

  const { data: run } = await admin
    .from("knowledge_ocr_runs")
    .insert({
      status: "running",
      created_by: options.createdBy ?? null,
      files_seen: pending.length,
    })
    .select("id")
    .single();

  const runId = run?.id as string | undefined;
  const embeddedIds: string[] = [];

  for (const article of pending) {
    if (!article.source_path) {
      result.failed.push({ path: article.title, error: "No source path." });
      continue;
    }

    try {
      const buffer = await downloadGcsObject(article.source_path);
      const ocr = await ocrPdf(buffer);

      const { error } = await admin
        .from("knowledge_articles")
        .update({
          content: ocr.text,
          ocr_status: "done",
          ocr_cost_usd: ocr.usage.costUsd,
          ocr_updated_at: new Date().toISOString(),
        })
        .eq("id", article.id);

      if (error) throw new Error(error.message);

      embeddedIds.push(article.id);
      result.processed += 1;
      result.costUsd += ocr.usage.costUsd;
      result.promptTokens += ocr.usage.promptTokens;
      result.completionTokens += ocr.usage.completionTokens;
    } catch (error) {
      const message = error instanceof Error ? error.message : "OCR failed.";
      result.failed.push({ path: article.source_path, error: message });
      logError("OCR article failed", error, { articleId: article.id });
      await admin
        .from("knowledge_articles")
        .update({ ocr_status: "failed", ocr_updated_at: new Date().toISOString() })
        .eq("id", article.id);
    }
  }

  // Make the freshly transcribed text searchable.
  if (embeddedIds.length > 0) {
    try {
      await createEmbedJob(embeddedIds, options.createdBy ?? null);
    } catch (error) {
      logError("Could not queue embeddings after OCR", error);
    }
  }

  if (runId) {
    await admin
      .from("knowledge_ocr_runs")
      .update({
        status: "completed",
        processed_count: result.processed,
        failed: result.failed,
        ocr_cost_usd: result.costUsd,
        ocr_prompt_tokens: result.promptTokens,
        ocr_completion_tokens: result.completionTokens,
        finished_at: new Date().toISOString(),
      })
      .eq("id", runId);
  }

  return result;
}
