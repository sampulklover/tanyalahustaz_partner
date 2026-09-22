import type { DocumentExtractResult } from "@/lib/knowledge-import";

/**
 * Client-side helper for POSTing documents to the extraction endpoint.
 *
 * Shared by the single-article form and the bulk importer so both upload
 * flows behave identically.
 */
export async function requestDocumentArticles(
  files: File[],
  defaultPublished: boolean,
): Promise<DocumentExtractResult[]> {
  const form = new FormData();
  for (const file of files) {
    form.append("files", file);
  }
  form.append("defaultPublished", String(defaultPublished));

  const response = await fetch("/api/knowledge/extract", {
    method: "POST",
    body: form,
  });

  const payload = (await response.json().catch(() => null)) as {
    results?: DocumentExtractResult[];
    error?: string;
  } | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "Could not process the uploaded documents.");
  }

  return Array.isArray(payload?.results) ? payload.results : [];
}
