const OPENROUTER_EMBEDDINGS_URL = "https://openrouter.ai/api/v1/embeddings";

// If you change OPENROUTER_EMBEDDING_MODEL: update EMBEDDING_DIMENSIONS to match,
// migrate knowledge_chunks vector size in Supabase if needed, truncate chunks, then run:
//   npm run embed-knowledge
// See docs/SYSTEM_EVOLUTION.md → "Changing the embedding model"
export const DEFAULT_EMBEDDING_MODEL = "nvidia/llama-nemotron-embed-vl-1b-v2:free";
export const EMBEDDING_DIMENSIONS = 2048;

function getEmbeddingModel() {
  return process.env.OPENROUTER_EMBEDDING_MODEL ?? DEFAULT_EMBEDDING_MODEL;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured on the server.");
  }

  if (texts.length === 0) {
    return [];
  }

  const response = await fetch(OPENROUTER_EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      "X-Title": "TanyaLah Ustaz Partners",
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

  return embeddings;
}

export async function embedText(text: string) {
  const [embedding] = await embedTexts([text]);
  return embedding;
}
