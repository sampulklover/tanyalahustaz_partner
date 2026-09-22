import { NextResponse } from "next/server";
import { generateKnowledgeFields } from "@/lib/knowledge-ai";
import { requireKnowledgeEditor } from "@/lib/dashboard";
import { extractDocumentText, isSupportedDocument } from "@/lib/knowledge-extract";
import {
  MAX_DOCUMENT_FILES,
  MAX_TOTAL_UPLOAD_BYTES,
  parseMarkdownImport,
  validateImportRow,
  type DocumentExtractResult,
} from "@/lib/knowledge-import";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 120;

const MIN_TEXT_LENGTH = 20;
const CONCURRENCY = 3;

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await fn(items[index], index);
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    () => worker(),
  );
  await Promise.all(workers);

  return results;
}

async function processFile(
  file: File,
  index: number,
  defaultPublished: boolean,
): Promise<DocumentExtractResult> {
  const name = file.name || `document-${index + 1}`;

  if (!isSupportedDocument(name)) {
    return { name, row: null, error: "Unsupported file type.", usedAi: false };
  }

  let text: string;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    text = await extractDocumentText(name, buffer);
  } catch (error) {
    return {
      name,
      row: null,
      error: error instanceof Error ? error.message : "Could not read the file.",
      usedAi: false,
    };
  }

  if (text.length < MIN_TEXT_LENGTH) {
    return {
      name,
      row: null,
      error: "No readable text found. Scanned PDFs need OCR before uploading.",
      usedAi: false,
    };
  }

  try {
    const fields = await generateKnowledgeFields({ filename: name, text });
    const parsed = validateImportRow(
      { ...fields, content: text, published: defaultPublished },
      1,
      { defaultPublished, source: name },
    );

    if (!parsed.row) {
      throw new Error(parsed.error ?? "Generated article was invalid.");
    }

    return { name, row: parsed.row, usedAi: true };
  } catch (error) {
    logError("Knowledge document AI structuring failed", error, { name });

    const fallback = parseMarkdownImport(text, name, defaultPublished);
    if (fallback.row) {
      return {
        name,
        row: fallback.row,
        usedAi: false,
        warning:
          "AI drafting failed, so the fields were filled from the document text. Review before importing.",
      };
    }

    return {
      name,
      row: null,
      error: fallback.error ?? "Could not process the file.",
      usedAi: false,
    };
  }
}

export async function POST(request: Request) {
  const admin = await requireKnowledgeEditor();
  if (!admin) {
    return NextResponse.json({ error: "Editor access required." }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const defaultPublished = form.get("defaultPublished") !== "false";
  const files = form
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ error: "No files were uploaded." }, { status: 400 });
  }

  if (files.length > MAX_DOCUMENT_FILES) {
    return NextResponse.json(
      { error: `You can upload up to ${MAX_DOCUMENT_FILES} documents at once.` },
      { status: 400 },
    );
  }

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > MAX_TOTAL_UPLOAD_BYTES) {
    return NextResponse.json(
      {
        error: `The uploads are larger than ${Math.round(
          MAX_TOTAL_UPLOAD_BYTES / 1024 / 1024,
        )} MB in total. Please upload fewer or smaller files.`,
      },
      { status: 413 },
    );
  }

  const results = await mapWithConcurrency(files, CONCURRENCY, (file, index) =>
    processFile(file, index, defaultPublished),
  );

  return NextResponse.json({ results });
}
