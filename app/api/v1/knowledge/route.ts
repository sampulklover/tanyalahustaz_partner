import { apiError, apiSuccess, parsePagination, withApiAuth } from "@/lib/api/handler";
import { createAdminClient } from "@/lib/supabase/admin";
import type { KnowledgeArticle } from "@/lib/types";

export async function GET(request: Request) {
  return withApiAuth(request, async (req) => {
    const admin = createAdminClient();
    const { limit, offset } = parsePagination(req);
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const query = searchParams.get("q");

    let dbQuery = admin
      .from("knowledge_articles")
      .select("slug, title, category, summary, tags, updated_at", { count: "exact" })
      .eq("published", true)
      .order("title", { ascending: true })
      .range(offset, offset + limit - 1);

    if (category) {
      dbQuery = dbQuery.eq("category", category);
    }

    if (query) {
      dbQuery = dbQuery.or(
        `title.ilike.%${query}%,summary.ilike.%${query}%,content.ilike.%${query}%`,
      );
    }

    const { data, error, count } = await dbQuery;

    if (error) {
      return apiError(error.message, 500);
    }

    return apiSuccess({
      data: data ?? [],
      pagination: { limit, offset, total: count ?? 0 },
      note: "These articles power the AI knowledge context for /api/v1/chat.",
    });
  });
}
