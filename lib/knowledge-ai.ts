import { generateJsonResponse } from "@/lib/openrouter";
import { slugify } from "@/lib/knowledge-form";

export const KNOWLEDGE_CATEGORIES = [
  "general",
  "fiqh",
  "ibadah",
  "aqidah",
  "akhlak",
] as const;

export type GeneratedKnowledgeFields = {
  title: string;
  slug: string;
  category: string;
  summary: string;
  tags: string[];
};

const MAX_PROMPT_CHARS = 14000;
const MAX_TITLE_CHARS = 120;
const MAX_SUMMARY_CHARS = 500;
const MAX_TAGS = 8;

const SYSTEM_PROMPT = `You turn uploaded reference documents into structured knowledge-base articles for the Tanyalah Ustaz Islamic Q&A assistant.

Return ONLY a JSON object with this exact shape:
{
  "title": "string",
  "slug": "string",
  "category": "string",
  "summary": "string",
  "tags": ["string"]
}

Rules:
- Base every field strictly on the document text. Never invent facts, rulings, or sources.
- "title": a short, descriptive title (max ${MAX_TITLE_CHARS} characters).
- "slug": lowercase ASCII words separated by hyphens, max 80 characters.
- "category": exactly one of: general, fiqh, ibadah, aqidah, akhlak.
- "summary": 2-3 clear sentences (max ${MAX_SUMMARY_CHARS} characters) that describe what the document covers.
- "tags": 3 to ${MAX_TAGS} short lowercase keywords, no duplicates.
- Write the title and summary in the same language as the document.
- If the document is not about Islamic knowledge, summarise it faithfully and use "general".

Do not include markdown fences or any text outside the JSON object.`;

function toStringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeTags(value: unknown): string[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  const seen = new Set<string>();
  const tags: string[] = [];

  for (const entry of raw) {
    const tag = toStringValue(entry).toLowerCase();
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
    if (tags.length >= MAX_TAGS) break;
  }

  return tags;
}

function normalizeCategory(value: unknown): string {
  const category = toStringValue(value).toLowerCase();
  return (KNOWLEDGE_CATEGORIES as readonly string[]).includes(category)
    ? category
    : "general";
}

/**
 * Ask the configured model to draft article metadata from extracted document
 * text. The document text itself becomes the article content, so the model is
 * only asked for the fields a human would otherwise have to type.
 */
export async function generateKnowledgeFields({
  filename,
  text,
}: {
  filename: string;
  text: string;
}): Promise<GeneratedKnowledgeFields> {
  const excerpt = text.slice(0, MAX_PROMPT_CHARS);

  const { data } = await generateJsonResponse({
    system: SYSTEM_PROMPT,
    user: `File name: ${filename}\n\nDocument text:\n"""\n${excerpt}\n"""`,
    temperature: 0.2,
    maxTokens: 900,
  });

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Model did not return a JSON object.");
  }

  const record = data as Record<string, unknown>;
  const title = toStringValue(record.title).slice(0, MAX_TITLE_CHARS);
  const summary = toStringValue(record.summary).slice(0, MAX_SUMMARY_CHARS);
  const slug = slugify(toStringValue(record.slug) || title);

  return {
    title,
    slug,
    category: normalizeCategory(record.category),
    summary,
    tags: normalizeTags(record.tags),
  };
}
