import { apiError, apiSuccess, parsePagination, withApiAuth } from "@/lib/api/handler";
import { ApiErrorCode } from "@/lib/api/errors";
import { sanitizeIlikeQuery } from "@/lib/sanitize";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  return withApiAuth(request, async (req, context) => {
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
      const safeQuery = sanitizeIlikeQuery(query);
      if (safeQuery) {
        dbQuery = dbQuery.or(
          `title.ilike.%${safeQuery}%,summary.ilike.%${safeQuery}%,content.ilike.%${safeQuery}%`,
        );
      }
    }

    const { data, error, count } = await dbQuery;

    if (error) {
      return apiError(
        ApiErrorCode.INTERNAL_ERROR,
        "Failed to load knowledge articles.",
        500,
        { requestId: context.requestId },
      );
    }

    return apiSuccess(
      {
        data: data ?? [],
        pagination: { limit, offset, total: count ?? 0 },
        note: "These articles power the AI knowledge context for /api/v1/chat.",
      },
      200,
      context.requestId,
    );
  });
}
