// Pure helpers for retrieving knowledge chunks. Kept dependency-free so they
// are easy to unit test.

/**
 * Pick the strongest matches while limiting how many chunks one article can
 * contribute. Without this, a single large document can fill the whole result
 * list and crowd out more relevant articles.
 *
 * Input rows are expected to be sorted by similarity (best first).
 */
export function selectDiverseChunks<T extends { article_id: string }>(
  rows: T[],
  { maxChunks, perArticle }: { maxChunks: number; perArticle: number },
): T[] {
  const perArticleMax = Math.max(1, perArticle);
  const seen = new Map<string, number>();
  const picked: T[] = [];

  for (const row of rows) {
    const count = seen.get(row.article_id) ?? 0;
    if (count >= perArticleMax) continue;

    seen.set(row.article_id, count + 1);
    picked.push(row);

    if (picked.length >= maxChunks) break;
  }

  return picked;
}
