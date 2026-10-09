import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { EMBEDDING_DIMENSIONS, embedTexts } from "./embeddings";

const originalFetch = globalThis.fetch;
const originalApiKey = process.env.OPENROUTER_API_KEY;
const originalBatch = process.env.EMBED_BATCH_SIZE;
const originalConcurrency = process.env.EMBED_CONCURRENCY;

/** Build a fake OpenRouter embeddings response echoing each input back as its vector. */
function fakeResponse(inputs: string[]) {
  return {
    ok: true,
    json: async () => ({
      data: inputs.map((text, index) => ({
        index,
        embedding: Array.from({ length: EMBEDDING_DIMENSIONS }, () => text.length),
      })),
      usage: { prompt_tokens: inputs.length, total_tokens: inputs.length, cost: 0 },
    }),
  } as unknown as Response;
}

describe("embedTexts", () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = "test-key";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = originalApiKey;
    if (originalBatch === undefined) delete process.env.EMBED_BATCH_SIZE;
    else process.env.EMBED_BATCH_SIZE = originalBatch;
    if (originalConcurrency === undefined) delete process.env.EMBED_CONCURRENCY;
    else process.env.EMBED_CONCURRENCY = originalConcurrency;
  });

  it("keeps vectors aligned with their input texts across many batches", async () => {
    process.env.EMBED_BATCH_SIZE = "2";
    process.env.EMBED_CONCURRENCY = "3";

    // Each text has a distinct length, so its vector's first value identifies it.
    const texts = ["a", "bb", "ccc", "dddd", "eeeee"];

    globalThis.fetch = (async (_url: string, init: { body: string }) => {
      const body = JSON.parse(init.body) as { input: string[] };
      return fakeResponse(body.input);
    }) as unknown as typeof fetch;

    const { embeddings } = await embedTexts(texts);

    assert.equal(embeddings.length, texts.length);
    embeddings.forEach((embedding, index) => {
      assert.equal(embedding.length, EMBEDDING_DIMENSIONS);
      assert.equal(embedding[0], texts[index].length);
    });
  });

  it("never runs more batches at once than the concurrency allows", async () => {
    process.env.EMBED_BATCH_SIZE = "1";
    process.env.EMBED_CONCURRENCY = "2";

    let inFlight = 0;
    let peak = 0;

    globalThis.fetch = (async (_url: string, init: { body: string }) => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      const body = JSON.parse(init.body) as { input: string[] };
      inFlight -= 1;
      return fakeResponse(body.input);
    }) as unknown as typeof fetch;

    await embedTexts(["a", "bb", "ccc", "dddd"]);

    assert.ok(peak <= 2, `expected at most 2 in flight, saw ${peak}`);
    assert.ok(peak > 1, "expected the batches to actually overlap");
  });
});
