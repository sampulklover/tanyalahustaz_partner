// OCR queue helpers that touch only the database. Kept separate from `ocr.ts`
// so pages can count pending scans without importing the native canvas module
// used to rasterise PDFs.

import { createAdminClient } from "@/lib/supabase/admin";

export type OcrPendingArticle = {
  id: string;
  title: string;
  source_path: string | null;
};

/** Articles flagged for OCR, oldest first. */
export async function listOcrPending(limit = 100): Promise<OcrPendingArticle[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("knowledge_articles")
    .select("id, title, source_path")
    .in("ocr_status", ["pending", "failed"])
    .order("updated_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as OcrPendingArticle[];
}

/** How many articles are waiting for OCR. */
export async function countOcrPending(): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("knowledge_articles")
    .select("id", { count: "exact", head: true })
    .in("ocr_status", ["pending", "failed"]);

  if (error) return 0;
  return count ?? 0;
}
