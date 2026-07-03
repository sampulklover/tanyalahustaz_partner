import { apiError, apiSuccess, withApiAuth } from "@/lib/api/handler";
import { createAdminClient } from "@/lib/supabase/admin";
import type { KnowledgeArticle } from "@/lib/types";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  const { slug } = await params;

  return withApiAuth(request, async () => {
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("knowledge_articles")
      .select("slug, title, category, summary, content, tags, updated_at")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle();

    if (error) {
      return apiError(error.message, 500);
    }

    if (!data) {
      return apiError("Knowledge article not found.", 404);
    }

    return apiSuccess({ data: data as Omit<KnowledgeArticle, "id" | "published" | "created_at"> });
  });
}
