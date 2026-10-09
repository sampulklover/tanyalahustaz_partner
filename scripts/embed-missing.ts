import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { createAdminClient } from "../lib/supabase/admin";
import { embedKnowledgeArticle } from "../lib/embed-knowledge";
import type { KnowledgeArticle } from "../lib/types";

/**
 * Embed ONLY the articles that have no chunks yet, instead of re-embedding the
 * whole table. Cheap and fast for finishing a backfill after a big sync.
 *
 * Usage:
 *   npx tsx scripts/embed-missing.ts [--limit=N] [--concurrency=N]
 */

const PAGE = 1000;

function numFlag(name: string, fallback: number): number {
  const arg = process.argv.find((v) => v.startsWith(`--${name}=`));
  if (!arg) return fallback;
  const n = Number(arg.split("=")[1]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const limit = numFlag("limit", 0); // 0 = no limit
const concurrency = numFlag("concurrency", Number(process.env.EMBED_ARTICLE_CONCURRENCY ?? 3));

async function main() {
  const db = createAdminClient();

  console.log("Finding articles without chunks…");

  // Query the missing articles directly, in pages, using an anti-join filter so
  // the database does the work. Diffing two separately-paginated lists in JS
  // over-counts when a page truncates, which would re-embed thousands of
  // already-done articles and waste credits.
  const missing: KnowledgeArticle[] = [];
  for (let from = 0; from < 500_000; from += PAGE) {
    const { data, error } = await db
      .rpc("knowledge_articles_missing_chunks", { page_size: PAGE, page_offset: from });
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as KnowledgeArticle[];
    missing.push(...batch);
    if (batch.length < PAGE) break;
  }

  console.log(`Articles without chunks: ${missing.length}`);

  if (limit > 0) missing.splice(limit);
  if (missing.length === 0) {
    console.log("Nothing to embed. All published articles have chunks. ✅");
    return;
  }

  console.log(`Embedding ${missing.length} article(s) at concurrency ${concurrency}…\n`);

  let done = 0;
  let chunks = 0;
  let failed = 0;
  const started = Date.now();
  let next = 0;

  const workers = Array.from({ length: Math.min(concurrency, missing.length) }, async () => {
    while (next < missing.length) {
      const idx = next;
      next += 1;
      const article = missing[idx];
      try {
        const r = await embedKnowledgeArticle(article);
        chunks += r.chunksWritten;
        done += 1;
      } catch (e) {
        failed += 1;
        console.error(`  ✗ ${article.title.slice(0, 50)}: ${e instanceof Error ? e.message : e}`);
      }
      if (done % 25 === 0 || done + failed === missing.length) {
        const secs = Math.round((Date.now() - started) / 1000);
        process.stderr.write(
          `\r  ${done + failed}/${missing.length} done, ${chunks} chunks, ${failed} failed (${secs}s)\x1b[K`,
        );
      }
    }
  });

  await Promise.all(workers);
  process.stderr.write("\n");
  console.log(`\nDone. Embedded ${done} article(s), wrote ${chunks} chunks, ${failed} failed.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
