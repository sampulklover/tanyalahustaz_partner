const OPENROUTER_EMBEDDINGS_URL = "https://openrouter.ai/api/v1/embeddings";

// If you change OPENROUTER_EMBEDDING_MODEL: update EMBEDDING_DIMENSIONS to match,
// migrate knowledge_chunks vector size in Supabase if needed, truncate chunks, then run:
//   npm run embed-knowledge
// See docs/SYSTEM_EVOLUTION.md → "Changing the embedding model"
export const DEFAULT_EMBEDDING_MODEL = "openai/text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;

/**
 * How many chunks to send per embedding request. Chunks are ~900 chars
 * (~230 tokens), so keep the batch small enough that one request stays well
 * under the model's per-call limits and a single bad chunk doesn't force a
 * costly re-send of the whole batch. 16 chunks ≈ 3–4k tokens per request.
 */
const EMBED_BATCH_SIZE = Math.max(1, Number(process.env.EMBED_BATCH_SIZE ?? 16));
const EMBED_MAX_RETRIES = 3;
/**
 * Above this many texts, a failed batch is retried one item at a time so a
 * single bad chunk doesn't waste the tokens of its healthy neighbours.
 */
const EMBED_SPLIT_THRESHOLD = 1;

function getEmbeddingModel() {
  return process.env.OPENROUTER_EMBEDDING_MODEL ?? DEFAULT_EMBEDDING_MODEL;
}

export function getEmbeddingModelId() {
  return getEmbeddingModel();
}

/**
 * Rough USD price per 1M prompt tokens for the embedding model, used only to
 * estimate a sync's cost before it runs. Override with EMBED_PRICE_PER_MILLION.
 * Default matches openai/text-embedding-3-small ($0.02 / 1M tokens).
 */
export function getEmbeddingPricePerMillion(): number {
  return Number(process.env.EMBED_PRICE_PER_MILLION ?? 0.02);
}

/**
 * Estimate embedding cost from the total source bytes of a set of files.
 * Bytes ≈ characters for extracted text; ~4 chars ≈ 1 token; chunks carry a
 * little overlap, so we pad the token count slightly. Only ever an estimate.
 */
export function estimateEmbedCost(bytes: number): number {
  const CHARS_PER_TOKEN = 4;
  const OVERLAP_PADDING = 1.15;
  const tokens = (bytes / CHARS_PER_TOKEN) * OVERLAP_PADDING;
  return (tokens / 1_000_000) * getEmbeddingPricePerMillion();
}

/** Token/cost usage reported by OpenRouter on an embeddings request. */
export type EmbeddingUsage = {
  promptTokens: number;
  totalTokens: number;
  costUsd: number;
};

export type EmbeddingResult = {
  embeddings: number[][];
  usage: EmbeddingUsage;
};

function emptyUsage(): EmbeddingUsage {
  return { promptTokens: 0, totalTokens: 0, costUsd: 0 };
}

function addUsage(total: EmbeddingUsage, part: EmbeddingUsage): EmbeddingUsage {
  return {
    promptTokens: total.promptTokens + part.promptTokens,
    totalTokens: total.totalTokens + part.totalTokens,
    costUsd: total.costUsd + part.costUsd,
  };
}

function normalizeEmbeddingUsage(raw: unknown): EmbeddingUsage {
  if (!raw || typeof raw !== "object") return emptyUsage();
  const usage = raw as { prompt_tokens?: number; total_tokens?: number; cost?: number };
  const promptTokens = Number(usage.prompt_tokens) || 0;
  const totalTokens = Number(usage.total_tokens) || promptTokens;
  const costUsd = Number(usage.cost) || 0;
  return { promptTokens, totalTokens, costUsd };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** One embedding request, no retries. Throws on any failure. */
async function requestEmbeddings(texts: string[]): Promise<EmbeddingResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured on the server.");
  }

  const response = await fetch(OPENROUTER_EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      "X-Title": "Tanyalah Ustaz Developers",
    },
    body: JSON.stringify({
      model: getEmbeddingModel(),
      input: texts,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Embedding request failed (${response.status}): ${errorBody}`);
  }

  const payload = (await response.json()) as {
    data?: Array<{ embedding?: number[]; index?: number }>;
    usage?: unknown;
  };

  const embeddings = (payload.data ?? [])
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map((item) => item.embedding)
    .filter((value): value is number[] => Array.isArray(value));

  if (embeddings.length !== texts.length) {
    throw new Error("Embedding API returned an unexpected number of vectors.");
  }

  for (const embedding of embeddings) {
    if (embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(
        `Expected ${EMBEDDING_DIMENSIONS}-dim embeddings from ${getEmbeddingModel()}, got ${embedding.length}.`,
      );
    }
  }

  return { embeddings, usage: normalizeEmbeddingUsage(payload.usage) };
}

/** Retry one request a few times with backoff. */
async function requestWithRetry(texts: string[]): Promise<EmbeddingResult> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < EMBED_MAX_RETRIES; attempt += 1) {
    try {
      return await requestEmbeddings(texts);
    } catch (error) {
      lastError = error;
      if (attempt < EMBED_MAX_RETRIES - 1) {
        await sleep(500 * (attempt + 1));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Embedding request failed.");
}

/**
 * Embed a batch. If it keeps failing, fall back to embedding each text on its
 * own so one bad chunk can't sink its healthy neighbours (and we don't re-pay
 * for the whole batch on every retry).
 */
async function embedBatch(texts: string[]): Promise<EmbeddingResult> {
  try {
    return await requestWithRetry(texts);
  } catch (error) {
    if (texts.length <= EMBED_SPLIT_THRESHOLD) throw error;

    const embeddings: number[][] = [];
    let usage = emptyUsage();

    for (const text of texts) {
      const result = await requestWithRetry([text]);
      embeddings.push(result.embeddings[0]);
      usage = addUsage(usage, result.usage);
    }

    return { embeddings, usage };
  }
}

export async function embedTexts(texts: string[]): Promise<EmbeddingResult> {
  if (texts.length === 0) {
    return { embeddings: [], usage: emptyUsage() };
  }

  const embeddings: number[][] = [];
  let usage = emptyUsage();

  for (let index = 0; index < texts.length; index += EMBED_BATCH_SIZE) {
    const batch = texts.slice(index, index + EMBED_BATCH_SIZE);
    const result = await embedBatch(batch);
    embeddings.push(...result.embeddings);
    usage = addUsage(usage, result.usage);
  }

  return { embeddings, usage };
}

export async function embedText(text: string) {
  const { embeddings } = await embedTexts([text]);
  const [embedding] = embeddings;
  return embedding;
}

// Query embeddings are cached because the same question (or a greeting) is
// asked repeatedly, and each miss costs an OpenRouter round-trip (~200-500ms).
const QUERY_CACHE_MAX = 500;
const queryEmbeddingCache = new Map<string, number[]>();

function queryCacheKey(text: string) {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Embed a search query, reusing a recent embedding for the same text. Safe:
 * identical text always produces an identical vector, so results are unchanged.
 */
export async function embedQuery(text: string): Promise<number[]> {
  const key = queryCacheKey(text);
  const cached = queryEmbeddingCache.get(key);
  if (cached) {
    // Refresh recency for the simple LRU eviction below.
    queryEmbeddingCache.delete(key);
    queryEmbeddingCache.set(key, cached);
    return cached;
  }

  const embedding = await embedText(text);

  queryEmbeddingCache.set(key, embedding);
  if (queryEmbeddingCache.size > QUERY_CACHE_MAX) {
    const oldest = queryEmbeddingCache.keys().next().value;
    if (oldest !== undefined) queryEmbeddingCache.delete(oldest);
  }

  return embedding;
}
