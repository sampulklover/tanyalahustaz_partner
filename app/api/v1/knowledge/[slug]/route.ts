import { apiError, apiSuccess, withApiAuth } from "@/lib/api/handler";
import { ApiErrorCode } from "@/lib/api/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import type { KnowledgeArticle } from "@/lib/types";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  const { slug } = await params;

  return withApiAuth(request, async (_req, context) => {
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("knowledge_articles")
      .select("slug, title, category, summary, content, tags, updated_at")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle();

    if (error) {
      return apiError(
        ApiErrorCode.INTERNAL_ERROR,
        "Failed to load knowledge article.",
        500,
        { requestId: context.requestId },
      );
    }

    if (!data) {
      return apiError(
        ApiErrorCode.NOT_FOUND,
        "Knowledge article not found.",
        404,
        { requestId: context.requestId },
      );
    }

    return apiSuccess(
      { data: data as Omit<KnowledgeArticle, "id" | "published" | "created_at"> },
      200,
      context.requestId,
    );
  });
}
