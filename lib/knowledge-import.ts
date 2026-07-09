import { parseTagsInput, slugify } from "@/lib/knowledge-form";

export type KnowledgeImportRow = {
  title: string;
  slug: string;
  category: string;
  summary: string;
  content: string;
  tags: string[];
  published: boolean;
};

export type ParsedImportRow = {
  index: number;
  source?: string;
  row: KnowledgeImportRow | null;
  error?: string;
};

export type BulkImportDuplicateStrategy = "skip" | "update";

export type BulkImportOptions = {
  embedAfterImport: boolean;
  duplicateStrategy: BulkImportDuplicateStrategy;
  defaultPublished: boolean;
};

export type BulkImportFailure = {
  index: number;
  title: string;
  error: string;
};

export type BulkImportResult = {
  imported: number;
  updated: number;
  skipped: number;
  failed: BulkImportFailure[];
  embedded: number;
  chunksWritten: number;
  embedJobId?: string;
  embedQueued?: boolean;
};

const REQUIRED_FIELDS = ["title", "summary", "content"] as const;

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "y", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "n", "off"].includes(normalized)) return false;
  }
  return fallback;
}

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((tag) => String(tag).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    if (value.includes("|")) {
      return value
        .split("|")
        .map((tag) => tag.trim())
        .filter(Boolean);
    }
    return parseTagsInput(value);
  }
  return [];
}

function firstParagraph(text: string) {
  const paragraph = text
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .find(Boolean);
  return paragraph ?? text.trim();
}

function titleFromFilename(filename: string) {
  const base = filename.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
  return base
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function validateImportRow(
  input: {
    title?: unknown;
    slug?: unknown;
    category?: unknown;
    summary?: unknown;
    content?: unknown;
    tags?: unknown;
    published?: unknown;
  },
  index: number,
  options: { defaultPublished: boolean; source?: string },
): ParsedImportRow {
  const title = String(input.title ?? "").trim();
  const slug = String(input.slug ?? "").trim() || slugify(title);
  const category = String(input.category ?? "general").trim() || "general";
  const summary = String(input.summary ?? "").trim();
  const content = String(input.content ?? "").trim();
  const tags = normalizeTags(input.tags);
  const published = normalizeBoolean(input.published, options.defaultPublished);

  if (!title || title.length < 3) {
    return {
      index,
      source: options.source,
      row: null,
      error: "Title is required (min 3 characters).",
    };
  }
  if (!slug || slug.length < 3) {
    return {
      index,
      source: options.source,
      row: null,
      error: "Slug is required (min 3 characters).",
    };
  }
  if (!summary || summary.length < 10) {
    return {
      index,
      source: options.source,
      row: null,
      error: "Summary is required (min 10 characters).",
    };
  }
  if (!content || content.length < 20) {
    return {
      index,
      source: options.source,
      row: null,
      error: "Content is required (min 20 characters).",
    };
  }

  return {
    index,
    source: options.source,
    row: { title, slug, category, summary, content, tags, published },
  };
}

function recordFromObject(
  value: Record<string, unknown>,
  index: number,
  defaultPublished: boolean,
  source?: string,
): ParsedImportRow {
  return validateImportRow(
    {
      title: value.title,
      slug: value.slug,
      category: value.category,
      summary: value.summary,
      content: value.content,
      tags: value.tags,
      published: value.published,
    },
    index,
    { defaultPublished, source },
  );
}

export function parseJsonImport(text: string, defaultPublished = true): ParsedImportRow[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return [{ index: 1, row: null, error: "Invalid JSON file." }];
  }

  const items = Array.isArray(parsed) ? parsed : [parsed];
  if (items.length === 0) {
    return [{ index: 1, row: null, error: "JSON file contains no articles." }];
  }

  return items.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return {
        index: index + 1,
        row: null,
        error: "Each entry must be a JSON object.",
      };
    }
    return recordFromObject(item as Record<string, unknown>, index + 1, defaultPublished);
  });
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      fields.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  fields.push(current);
  return fields.map((field) => field.trim());
}

export function parseCsvImport(text: string, defaultPublished = true): ParsedImportRow[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [{ index: 1, row: null, error: "CSV must include a header row and at least one data row." }];
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  const missing = REQUIRED_FIELDS.filter((field) => !headers.includes(field));
  if (missing.length > 0) {
    return [
      {
        index: 1,
        row: null,
        error: `CSV is missing required column(s): ${missing.join(", ")}.`,
      },
    ];
  }

  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);
    const record: Record<string, string> = {};
    headers.forEach((header, headerIndex) => {
      record[header] = values[headerIndex] ?? "";
    });

    return recordFromObject(record, index + 1, defaultPublished);
  });
}

function parseFrontmatter(text: string) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return null;
  }

  const meta: Record<string, string | string[] | boolean> = {};
  const lines = match[1].split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf(":");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim().toLowerCase();
    let value = trimmed.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (value.startsWith("[") && value.endsWith("]")) {
      meta[key] = value
        .slice(1, -1)
        .split(",")
        .map((part) => part.trim().replace(/^['"]|['"]$/g, ""))
        .filter(Boolean);
      continue;
    }

    if (["true", "false"].includes(value.toLowerCase())) {
      meta[key] = value.toLowerCase() === "true";
      continue;
    }

    meta[key] = value;
  }

  return {
    meta,
    content: match[2].trim(),
  };
}

export function parseMarkdownImport(
  text: string,
  filename?: string,
  defaultPublished = true,
): ParsedImportRow {
  const source = filename ?? "markdown";
  const frontmatter = parseFrontmatter(text);

  if (frontmatter) {
    return recordFromObject(
      {
        title: frontmatter.meta.title,
        slug: frontmatter.meta.slug,
        category: frontmatter.meta.category,
        summary: frontmatter.meta.summary,
        content: frontmatter.content,
        tags: frontmatter.meta.tags,
        published: frontmatter.meta.published,
      },
      1,
      defaultPublished,
      source,
    );
  }

  const content = text.trim();
  const title = titleFromFilename(filename ?? "article");
  const summary = firstParagraph(content).slice(0, 280);

  return validateImportRow(
    {
      title,
      slug: slugify(title),
      category: "general",
      summary,
      content,
      tags: [],
      published: defaultPublished,
    },
    1,
    { defaultPublished, source },
  );
}

export function parseMarkdownBundle(
  files: { name: string; content: string }[],
  defaultPublished = true,
): ParsedImportRow[] {
  if (files.length === 0) {
    return [{ index: 1, row: null, error: "No markdown files found." }];
  }

  return files.map((file, index) => {
    const row = parseMarkdownImport(file.content, file.name, defaultPublished);
    return { ...row, index: index + 1 };
  });
}

export type ImportFileKind = "json" | "csv" | "markdown";

export function detectImportFileKind(filename: string, text: string): ImportFileKind {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".json")) return "json";
  if (lower.endsWith(".csv")) return "csv";
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) return "markdown";

  const trimmed = text.trim();
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) return "json";
  if (trimmed.startsWith("---")) return "markdown";
  return "csv";
}

export function parseImportFile(
  filename: string,
  text: string,
  defaultPublished = true,
): ParsedImportRow[] {
  const kind = detectImportFileKind(filename, text);

  if (kind === "json") {
    return parseJsonImport(text, defaultPublished);
  }
  if (kind === "markdown") {
    return [parseMarkdownImport(text, filename, defaultPublished)];
  }
  return parseCsvImport(text, defaultPublished);
}

export function makeUniqueSlug(baseSlug: string, usedSlugs: Set<string>) {
  if (!usedSlugs.has(baseSlug)) {
    usedSlugs.add(baseSlug);
    return baseSlug;
  }

  let suffix = 2;
  while (usedSlugs.has(`${baseSlug}-${suffix}`)) {
    suffix += 1;
  }

  const unique = `${baseSlug}-${suffix}`;
  usedSlugs.add(unique);
  return unique;
}

export const IMPORT_JSON_TEMPLATE = JSON.stringify(
  [
    {
      title: "Combining prayers while traveling",
      slug: "combining-prayers-travel",
      category: "fiqh",
      summary: "A concise overview of jamak and qasar for travelers.",
      content:
        "When traveling beyond the defined distance, a Muslim may shorten (qasar) and combine (jamak) certain prayers. This article explains the conditions and rulings.",
      tags: ["solat", "travel", "fiqh"],
      published: true,
    },
  ],
  null,
  2,
);

export const IMPORT_CSV_TEMPLATE = [
  "title,slug,category,summary,content,tags,published",
  '"Combining prayers while traveling",combining-prayers-travel,fiqh,"A concise overview of jamak and qasar for travelers.","When traveling beyond the defined distance, a Muslim may shorten (qasar) and combine (jamak) certain prayers.",solat|travel|fiqh,true',
].join("\n");

export const IMPORT_MARKDOWN_TEMPLATE = `---
title: Combining prayers while traveling
slug: combining-prayers-travel
category: fiqh
summary: A concise overview of jamak and qasar for travelers.
tags: [solat, travel, fiqh]
published: true
---

When traveling beyond the defined distance, a Muslim may shorten (qasar) and combine (jamak) certain prayers. This article explains the conditions and rulings.
`;
