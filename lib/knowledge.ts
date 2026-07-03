import type { KnowledgeArticle, KnowledgeSource } from "@/lib/types";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_CONTEXT_ARTICLES = 4;

export function toKnowledgeSource(article: KnowledgeArticle): KnowledgeSource {
  return {
    slug: article.slug,
    title: article.title,
    category: article.category,
  };
}

export function buildKnowledgeContext(articles: KnowledgeArticle[]) {
  if (articles.length === 0) {
    return "No specific knowledge articles matched. Answer carefully and recommend consulting a qualified scholar for complex matters.";
  }

  return articles
    .map(
      (article, index) =>
        `[Source ${index + 1}: ${article.title} (${article.category})]\n${article.summary}\n\n${article.content}`,
    )
    .join("\n\n---\n\n");
}

export async function findRelevantKnowledge(message: string, category?: string) {
  const admin = createAdminClient();
  const searchTerms = message
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .slice(0, 6);

  let query = admin
    .from("knowledge_articles")
    .select("*")
    .eq("published", true)
    .order("updated_at", { ascending: false })
    .limit(MAX_CONTEXT_ARTICLES);

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  let articles = (data ?? []) as KnowledgeArticle[];

  if (searchTerms.length > 0 && !category) {
    const scored = articles
      .map((article) => {
        const haystack = `${article.title} ${article.summary} ${article.content} ${article.tags.join(" ")}`.toLowerCase();
        const score = searchTerms.reduce(
          (total, term) => total + (haystack.includes(term) ? 1 : 0),
          0,
        );
        return { article, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.article);

    if (scored.length > 0) {
      articles = scored.slice(0, MAX_CONTEXT_ARTICLES);
    }
  }

  return articles;
}
