// Server-side helpers for turning uploaded documents (PDF, DOCX, TXT) into
// plain text that the knowledge importer can structure into articles.

import { MAX_DOCUMENT_BYTES } from "@/lib/knowledge-import";

export const SUPPORTED_DOCUMENT_EXTENSIONS = [".pdf", ".docx", ".txt"] as const;

export type DocumentKind = "pdf" | "docx" | "text";

export function documentKindFromFilename(filename: string): DocumentKind | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".docx")) return "docx";
  if (lower.endsWith(".txt")) return "text";
  return null;
}

export function isSupportedDocument(filename: string): boolean {
  return documentKindFromFilename(filename) !== null;
}

export function cleanExtractedText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join("\n\n") : text;
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const mammoth = (await import("mammoth")).default;
  const { value } = await mammoth.extractRawText({ buffer });
  return value;
}

export async function extractDocumentText(
  filename: string,
  buffer: Buffer,
): Promise<string> {
  const kind = documentKindFromFilename(filename);

  if (!kind) {
    throw new Error(`Unsupported file type: ${filename}`);
  }

  if (buffer.byteLength === 0) {
    throw new Error("The file is empty.");
  }

  if (buffer.byteLength > MAX_DOCUMENT_BYTES) {
    throw new Error(
      `The file is larger than ${Math.round(MAX_DOCUMENT_BYTES / 1024 / 1024)} MB.`,
    );
  }

  if (kind === "pdf") {
    return cleanExtractedText(await extractPdfText(buffer));
  }

  if (kind === "docx") {
    return cleanExtractedText(await extractDocxText(buffer));
  }

  return cleanExtractedText(buffer.toString("utf-8").replace(/^\uFEFF/, ""));
}
