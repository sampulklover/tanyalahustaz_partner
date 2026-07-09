/** Sanitize user input for PostgREST ilike filters to prevent filter injection. */
export function sanitizeIlikeQuery(query: string): string {
  return query
    .replace(/[%_\\]/g, "")
    .replace(/[,().]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}
