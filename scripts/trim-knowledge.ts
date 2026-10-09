import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { createAdminClient } from "../lib/supabase/admin";

/**
 * Report how much each top-level GCS folder costs in database space, then
 * optionally delete chosen folders to get back under a storage quota.
 *
 * Deleting a knowledge_articles row cascades to its knowledge_chunks rows (see
 * the FK in 20250706000000_vector_rag.sql), so both the text and the vectors are
 * freed in one statement.
 *
 * Usage:
 *   npx tsx scripts/trim-knowledge.ts                 # report only, deletes nothing
 *   npx tsx scripts/trim-knowledge.ts --delete=dorar,html_al-afkar
 *   npx tsx scripts/trim-knowledge.ts --delete=dorar --yes   # skip confirmation
 */

const PAGE = 1000;

/** Minimal PostgREST builder shape so fetchAll can page any query. */
type PageableQuery = {
  range: (from: number, to: number) => PromiseLike<{
    data: unknown[] | null;
    error: { message: string } | null;
  }>;
};

async function fetchAll<T>(build: () => PageableQuery): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; from < 100_000; from += PAGE) {
    const { data, error } = await build().range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as T[];
    rows.push(...batch);
    if (batch.length < PAGE) break;
  }
  return rows;
}

function valueFlags(name: string): string[] {
  const prefix = `--${name}=`;
  return process.argv
    .filter((v) => v.startsWith(prefix))
    .flatMap((v) => v.slice(prefix.length).split(","))
    .map((s) => s.trim())
    .filter(Boolean);
}

async function report() {
  const db = createAdminClient();

  const articles = await fetchAll<{ id: string; source_path: string | null }>(() =>
    db
      .from("knowledge_articles")
      .select("id, source_path")
      .eq("source_provider", "gcs")
      .order("id", { ascending: true }),
  );

  // Count chunks per article so we can attribute storage to a folder.
  const chunks = await fetchAll<{ article_id: string }>(() =>
    db.from("knowledge_chunks").select("article_id").order("article_id", { ascending: true }),
  );
  const chunksByArticle = new Map<string, number>();
  for (const c of chunks) {
    chunksByArticle.set(c.article_id, (chunksByArticle.get(c.article_id) ?? 0) + 1);
  }

  // Group by top-level folder.
  const byFolder = new Map<string, { articles: number; chunks: number }>();
  for (const a of articles) {
    const folder = (a.source_path ?? "(none)").split("/")[0] || "(root)";
    const entry = byFolder.get(folder) ?? { articles: 0, chunks: 0 };
    entry.articles += 1;
    entry.chunks += chunksByArticle.get(a.id) ?? 0;
    byFolder.set(folder, entry);
  }

  // A 1536-dim vector is ~6 KB on disk; text adds a little. Rough but useful.
  const BYTES_PER_CHUNK = 6 * 1024;

  const rows = [...byFolder.entries()].sort((a, b) => b[1].chunks - a[1].chunks);
  let totalChunks = 0;

  console.log("\n── Storage by top-level folder ─────────────────────");
  console.log(
    `${"folder".padEnd(34)} ${"articles".padStart(8)} ${"chunks".padStart(9)} ${"est. MB".padStart(9)}`,
  );
  for (const [folder, { articles, chunks }] of rows) {
    totalChunks += chunks;
    console.log(
      `${folder.padEnd(34)} ${String(articles).padStart(8)} ${String(chunks).padStart(9)} ` +
        `${(chunks * BYTES_PER_CHUNK / 1024 / 1024).toFixed(1).padStart(9)}`,
    );
  }
  console.log(
    `${"TOTAL".padEnd(34)} ${String(articles.length).padStart(8)} ${String(totalChunks).padStart(9)} ` +
      `${(totalChunks * BYTES_PER_CHUNK / 1024 / 1024).toFixed(1).padStart(9)}`,
  );

  const targetMb = 480; // leave headroom under the 0.5 GB free cap
  const currentMb = totalChunks * BYTES_PER_CHUNK / 1024 / 1024;
  if (currentMb > targetMb) {
    console.log(
      `\nOver target: ~${currentMb.toFixed(0)} MB vs ~${targetMb} MB budget. ` +
        `Delete ~${(currentMb - targetMb).toFixed(0)} MB worth (biggest folders first).`,
    );
  }
}

async function deleteFolders(folders: string[], skipConfirm: boolean) {
  const db = createAdminClient();
  const target = new Set(folders.map((f) => f.toLowerCase()));

  const articles = await fetchAll<{ id: string; source_path: string | null }>(() =>
    db
      .from("knowledge_articles")
      .select("id, source_path")
      .eq("source_provider", "gcs")
      .order("id", { ascending: true }),
  );

  const toDelete = articles.filter((a) => {
    const folder = (a.source_path ?? "").split("/")[0] || "";
    return target.has(folder.toLowerCase());
  });

  if (toDelete.length === 0) {
    console.log("\nNo matching articles found for: " + folders.join(", "));
    return;
  }

  console.log(`\nAbout to DELETE ${toDelete.length} article(s) from: ${folders.join(", ")}`);
  console.log("Their chunks and vectors are removed too (cascade).");

  if (!skipConfirm) {
    console.log("\nRe-run with --yes to actually delete. This cannot be undone.");
    return;
  }

  const ids = toDelete.map((a) => a.id);
  let deleted = 0;
  for (let i = 0; i < ids.length; i += 200) {
    const batch = ids.slice(i, i + 200);
    const { error } = await db.from("knowledge_articles").delete().in("id", batch);
    if (error) throw new Error(error.message);
    deleted += batch.length;
    process.stdout.write(`\r  deleted ${deleted}/${ids.length} articles…`);
  }
  process.stdout.write("\n");
  console.log("Done. Run the report again (no flags) to confirm the new size.");
  console.log("Tip: also untick these folders in the dashboard so the next sync won't re-add them.");
}

async function main() {
  const deleteArg = valueFlags("delete");
  const skipConfirm = process.argv.includes("--yes");

  await report();

  if (deleteArg.length === 0) {
    console.log(
      "\nReport only. To delete: npx tsx scripts/trim-knowledge.ts --delete=folder1,folder2 --yes",
    );
    return;
  }

  await deleteFolders(deleteArg, skipConfirm);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
