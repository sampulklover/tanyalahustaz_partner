import { authenticateApiRequest } from "@/lib/api-auth";
import { stripLeadingBoilerplate } from "@/lib/knowledge-extract";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Return one knowledge article's full text by slug, so the playground can show
 * the source behind a citation when a pill is clicked. Auth uses the caller's
 * own API key (same gate as the playground chat).
 */
export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  const slug = new URL(request.url).searchParams.get("slug")?.trim();
  if (!slug) {
    return Response.json({ error: "Missing slug." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("knowledge_articles")
    .select("slug, title, category, summary, content, source_path, published")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!data || !data.published) {
    return Response.json({ error: "Article not found." }, { status: 404 });
  }

  return Response.json({
    article: {
      ...data,
      content: stripLeadingBoilerplate(data.content ?? ""),
    },
  });
}
