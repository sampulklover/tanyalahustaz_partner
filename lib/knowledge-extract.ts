// Server-side helpers for turning uploaded documents (PDF, DOCX, TXT, HTML,
// Markdown) into plain text that the knowledge importer can structure into
// articles.

import { MAX_DOCUMENT_BYTES } from "@/lib/knowledge-import";

export const SUPPORTED_DOCUMENT_EXTENSIONS = [".pdf", ".docx", ".txt"] as const;

/** Extensions the Google Cloud Storage sync can read (a wider set than uploads). */
export const SYNCABLE_DOCUMENT_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".txt",
  ".md",
  ".markdown",
  ".html",
  ".htm",
] as const;

export type DocumentKind = "pdf" | "docx" | "text" | "html" | "markdown";

export function documentKindFromFilename(filename: string): DocumentKind | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".docx")) return "docx";
  if (lower.endsWith(".txt")) return "text";
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) return "markdown";
  if (lower.endsWith(".html") || lower.endsWith(".htm")) return "html";
  return null;
}

export function isSupportedDocument(filename: string): boolean {
  const kind = documentKindFromFilename(filename);
  return kind === "pdf" || kind === "docx" || kind === "text";
}

export function isSyncableDocument(filename: string): boolean {
  return documentKindFromFilename(filename) !== null;
}

export function cleanExtractedText(raw: string): string {
  const normalized = raw
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return stripLeadingBoilerplate(normalized);
}

/**
 * Scraped HTML keeps the site's navigation menu as plain lines at the top
 * ("Utama", "Bank Soalan", "Login", …). Those lines waste context and look like
 * junk in citations, so drop a short leading run of bare menu items before the
 * real content begins. Bounded so a genuine short article is never emptied.
 */
const BOILERPLATE_LINE = /^[A-Za-z][A-Za-z0-9 '&/().-]{0,40}$/;

export function stripLeadingBoilerplate(text: string): string {
  const lines = text.split("\n");
  // Only look within the first screenful of lines.
  const limit = Math.min(lines.length, 40);

  // Find where the real content begins. Sites put a page title (long line), then
  // a run of short menu items ("Utama", "Login", …), then the actual article.
  let i = 0;
  let menuish = 0;
  let contentStart = -1;

  for (; i < limit; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;

    const looksLikeContent =
      line.length > 80 || /^\d+[.)]/.test(line) || /^(soalan|jawapan|persoalan)\s*:/i.test(line);

    if (looksLikeContent) {
      // A long line can still be the site's page title; treat the first long
      // line as a possible header and keep looking for the menu/content.
      if (menuish === 0 && contentStart === -1) {
        contentStart = i;
        continue;
      }
      contentStart = contentStart === -1 ? i : contentStart;
      break;
    }

    const looksLikeMenu = BOILERPLATE_LINE.test(line) && line.split(" ").length <= 4;
    if (looksLikeMenu) {
      menuish += 1;
    } else if (menuish > 0) {
      // Menu run ended at a non-menu line: content starts here.
      contentStart = i;
      break;
    }
  }

  // Only trim when we actually detected a menu run.
  if (menuish >= 4 && contentStart > 0 && contentStart < lines.length) {
    return lines.slice(contentStart).join("\n").trim();
  }
  return text;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/gi, "'");
}

/** Strip scripts, styles and tags so the model sees readable text only. */
function extractHtmlText(buffer: Buffer): string {
  const html = buffer.toString("utf-8");
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<\/(p|div|section|article|li|h[1-6]|tr|br)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  );
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
  options: { maxBytes?: number } = {},
): Promise<string> {
  const kind = documentKindFromFilename(filename);
  const maxBytes = options.maxBytes ?? MAX_DOCUMENT_BYTES;

  if (!kind) {
    throw new Error(`Unsupported file type: ${filename}`);
  }

  if (buffer.byteLength === 0) {
    throw new Error("The file is empty.");
  }

  if (buffer.byteLength > maxBytes) {
    throw new Error(
      `The file is larger than ${Math.round(maxBytes / 1024 / 1024)} MB.`,
    );
  }

  if (kind === "pdf") {
    return cleanExtractedText(await extractPdfText(buffer));
  }

  if (kind === "docx") {
    return cleanExtractedText(await extractDocxText(buffer));
  }

  if (kind === "html") {
    return cleanExtractedText(extractHtmlText(buffer));
  }

  return cleanExtractedText(buffer.toString("utf-8").replace(/^\uFEFF/, ""));
}
