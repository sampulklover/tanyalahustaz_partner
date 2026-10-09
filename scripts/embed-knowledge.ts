import { config } from "dotenv";
import { embedAllKnowledgeArticles } from "../lib/embed-knowledge";

config({ path: ".env.local" });
config({ path: ".env" });

const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const parsedLimit = limitArg ? Number(limitArg.split("=")[1]) : undefined;
const limit = Number.isFinite(parsedLimit) ? parsedLimit : undefined;

/**
 * Bulk embedding backfill. Runs the embedding work locally (no 300s serverless
 * request cap) and overlaps articles + batches via EMBED_CONCURRENCY and
 * EMBED_ARTICLE_CONCURRENCY, so a large backlog drains far faster than the
 * in-app sync path.
 *
 * Example:
 *   EMBED_CONCURRENCY=8 EMBED_ARTICLE_CONCURRENCY=6 npm run embed-knowledge
 */
async function main() {
  const started = Date.now();

  console.log(
    limit
      ? `Embedding up to ${limit} published article(s)...`
      : "Embedding all published knowledge articles...",
  );
  console.log(
    `Concurrency: EMBED_CONCURRENCY=${process.env.EMBED_CONCURRENCY ?? 4}, ` +
      `EMBED_ARTICLE_CONCURRENCY=${process.env.EMBED_ARTICLE_CONCURRENCY ?? 4}, ` +
      `EMBED_BATCH_SIZE=${process.env.EMBED_BATCH_SIZE ?? 64}`,
  );

  const result = await embedAllKnowledgeArticles({ limit });

  const seconds = Math.round((Date.now() - started) / 1000);
  console.log(
    `Done in ${seconds}s. Processed ${result.articlesProcessed} article(s), ` +
      `wrote ${result.chunksWritten} chunk embedding(s), ` +
      `cost ~$${result.costUsd.toFixed(4)}.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
