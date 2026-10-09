import { config } from "dotenv";
import { syncKnowledgeFromGcs, type SyncProgress } from "../lib/gcs-sync";
import { getPendingEmbedJobCount, processPendingEmbedJobs } from "../lib/knowledge-embed-jobs";
import { countKnowledgeChunks } from "../lib/embed-knowledge";

config({ path: ".env.local" });
config({ path: ".env" });

// Per-file failures are expected (bad files, transient DB blips) and shouldn't
// print full stack traces — one concise line each keeps the progress readable.
process.env.SYNC_QUIET_ERRORS = "1";

// The GCS client adds listeners to per-request PassThrough streams (one for each
// concurrent download). Node warns once a stream passes 10 listeners, which is
// harmless here but floods the terminal. These emitters aren't exposed, so the
// only way to quiet them is to drop that one warning while keeping all others.
const originalEmitWarning = process.emitWarning.bind(process);
process.emitWarning = ((warning: string | Error, ...rest: unknown[]) => {
  const name =
    typeof warning === "string" ? String(rest[0] ?? "") : warning?.name ?? "";
  if (name === "MaxListenersExceededWarning") return;
  return (originalEmitWarning as (...args: unknown[]) => void)(warning, ...rest);
}) as typeof process.emitWarning;

/**
 * Local bulk sync: pull every selected GCS folder into the knowledge base, then
 * drain the embedding queue — all from your machine, so there is no 300s
 * serverless request limit. Mirrored files are skipped by etag on later runs, so
 * this is safe to re-run and safe to interrupt.
 *
 * Tune the speed with env vars, e.g.:
 *   GCS_SYNC_CONCURRENCY=6 EMBED_CONCURRENCY=8 EMBED_ARTICLE_CONCURRENCY=6 \
 *     npm run sync-gcs
 *
 * Flags:
 *   --all                 Sync the whole bucket, ignoring the dashboard selection
 *   --max-files=N         Files per sync pass (default 500)
 *   --include=f1,f2       Sync ONLY these top-level folders (e.g. sunnah,quran)
 *   --exclude=f1,f2       Skip these top-level folders (e.g. sunnah,quran)
 *   --dedupe              Skip files whose name already appears in another folder
 *   --prune               Also delete mirrors whose source is no longer selected
 *
 * Both --include and --exclude are repeatable and comma-separated:
 *   npm run sync-gcs -- --all --include=sunnah --include=quran
 */

function readNumberFlag(name: string, fallback: number): number {
  const arg = process.argv.find((value) => value.startsWith(`--${name}=`));
  if (!arg) return fallback;
  const parsed = Number(arg.split("=")[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Collect every value from a repeatable --name=value flag. */
function readListFlag(name: string): string[] {
  const prefix = `--${name}=`;
  return process.argv
    .filter((v) => v.startsWith(prefix))
    .flatMap((v) => v.slice(prefix.length).split(","))
    .map((s) => s.trim())
    .filter(Boolean);
}

const maxFilesPerPass = readNumberFlag("max-files", 500);
const prune = process.argv.includes("--prune");
// Mirror the whole bucket instead of the dashboard selection.
const syncAll = process.argv.includes("--all");
// Skip duplicate basenames across folders.
const dedupe = process.argv.includes("--dedupe");
// Top-level folders to sync / skip, e.g. --include=sunnah,quran  --exclude=mais
const includeFolders = readListFlag("include");
const excludeFolders = readListFlag("exclude");
// Safety stop so a runaway selection can't loop forever.
const MAX_PASSES = readNumberFlag("max-passes", 500);

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

/** Keep processing pending embed jobs until the queue is empty. */
async function drainEmbedQueue(): Promise<number> {
  let drained = 0;
  const startJobs = await getPendingEmbedJobCount();
  if (startJobs === 0) return 0;

  const chunksBefore = await countKnowledgeChunks();
  let lastLine = 0;

  while ((await getPendingEmbedJobCount()) > 0) {
    try {
      await processPendingEmbedJobs(1);
    } catch (error) {
      // One bad embed job (e.g. a statement timeout on a huge article) must not
      // abort the whole sync. It's already marked failed in the DB and will be
      // retried on the next run, so just note it and keep draining the queue.
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`\r  embed job skipped: ${message}\x1b[K\n`);
    }
    drained += 1;

    // A live line so the embed phase isn't a silent wait. "job" here means one
    // processed batch, which can be more than the starting queue size.
    const now = Date.now();
    if (now - lastLine >= 1500) {
      lastLine = now;
      const written = (await countKnowledgeChunks()) - chunksBefore;
      const left = await getPendingEmbedJobCount();
      process.stderr.write(
        `\r  embedding… ${drained} batch(es) done, +${written} chunks, ${left} left\x1b[K`,
      );
    }
  }

  const totalWritten = (await countKnowledgeChunks()) - chunksBefore;
  process.stderr.write(`\r  embedded ${drained} batch(es), +${totalWritten} chunks\x1b[K\n`);
  return drained;
}

// Live per-file progress, throttled so it updates a single line instead of
// flooding the terminal. `stderr` is used so it doesn't pollute piped output.
let lastPrint = 0;
const PROGRESS_INTERVAL_MS = 1500;
function renderProgress(progress: SyncProgress) {
  const now = Date.now();
  if (now - lastPrint < PROGRESS_INTERVAL_MS && progress.done < progress.total) return;
  lastPrint = now;

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 100;
  const name = progress.currentPath.length > 45
    ? `…${progress.currentPath.slice(-44)}`
    : progress.currentPath;

  process.stderr.write(
    `\r  ${progress.done}/${progress.total} (${pct}%)  ` +
      `new ${progress.created}  upd ${progress.updated}  fail ${progress.failed}  ${name}\x1b[K`,
  );
}

// Ctrl+C shouldn't strand a half-embedded file. On the first interrupt we stop
// starting new passes, drain the queue, then exit; a second Ctrl+C forces quit.
let stopping = false;
process.on("SIGINT", () => {
  if (stopping) {
    console.log("\nForced exit.");
    process.exit(130);
  }
  stopping = true;
  console.log("\nStopping after the current pass, then draining embeddings... (Ctrl+C again to force)");
});

async function main() {
  const started = Date.now();
  console.log("Bulk GCS sync starting...");
  console.log(
    `Concurrency: GCS_SYNC_CONCURRENCY=${process.env.GCS_SYNC_CONCURRENCY ?? 4}, ` +
      `EMBED_CONCURRENCY=${process.env.EMBED_CONCURRENCY ?? 4}, ` +
      `EMBED_ARTICLE_CONCURRENCY=${process.env.EMBED_ARTICLE_CONCURRENCY ?? 4}`,
  );
  console.log(`Files per pass: ${maxFilesPerPass}${prune ? " (prune on)" : ""}\n`);
  if (syncAll) {
    console.log("Mode: --all (whole bucket, ignoring the dashboard selection)\n");
  }
  if (includeFolders.length > 0) {
    console.log(`Only folders: ${includeFolders.join(", ")}\n`);
  }
  if (excludeFolders.length > 0) {
    console.log(`Excluding folders: ${excludeFolders.join(", ")}\n`);
  }
  if (dedupe) {
    console.log("Dedupe: skipping duplicate filenames across folders\n");
  }

  let created = 0;
  let updated = 0;
  let removed = 0;
  let skipped = 0;
  const allFailures: { path: string; error: string }[] = [];

  for (let pass = 1; pass <= MAX_PASSES; pass += 1) {
    if (stopping) break;

    console.log(`── Sync pass ${pass} ─────────────────────────`);
    const result = await syncKnowledgeFromGcs({
      maxFiles: maxFilesPerPass,
      prune,
      all: syncAll,
      dedupe,
      includeFolders,
      excludeFolders,
      onProgress: renderProgress,
    });
    process.stderr.write("\n"); // end the live progress line

    // syncKnowledgeFromGcs catches its own failures and returns status "failed"
    // rather than throwing, so stop here instead of reporting a false success.
    if (result.status === "failed") {
      console.error(`\nSync pass ${pass} failed: ${result.error ?? "unknown error"}`);
      if (result.error?.includes("No sources selected")) {
        console.error(
          "Pick folders or files to sync in the dashboard (Knowledge → Sources) first.",
        );
      }
      process.exitCode = 1;
      break;
    }

    created += result.created;
    updated += result.updated;
    removed += result.removed;
    skipped += result.skipped;
    allFailures.push(...result.failed);

    console.log(
      `created ${result.created}, updated ${result.updated}, ` +
        `skipped ${result.skipped}, deferred ${result.deferred}, failed ${result.failed.length}`,
    );

    // Drain the embed jobs this pass queued before moving on, so memory and DB
    // writes stay bounded and progress is visible.
    const pendingToEmbed = await getPendingEmbedJobCount();
    if (pendingToEmbed > 0) {
      console.log(`Embedding ${pendingToEmbed} job(s) for this pass...`);
      await drainEmbedQueue();
    }

    if (result.deferred === 0) {
      console.log("\nAll files processed.");
      break;
    }

    console.log(`${result.deferred} file(s) left; continuing...\n`);
  }

  // Final drain covers the "stopped early" case: never leave a file queued.
  const pending = await getPendingEmbedJobCount();
  if (pending > 0 || stopping) {
    console.log("\nDraining remaining embeddings...");
    await drainEmbedQueue();
  }

  const seconds = Math.round((Date.now() - started) / 1000);
  console.log("\n═══════════ Bulk sync complete ═══════════");
  console.log(
    `Created ${created}, updated ${updated}, removed ${removed}, skipped ${skipped} (unchanged).`,
  );
  console.log(`Failed ${allFailures.length} file(s).`);
  for (const failure of allFailures.slice(0, 50)) {
    console.log(`  ✗ ${failure.path}: ${failure.error}`);
  }
  if (allFailures.length > 50) {
    console.log(`  …and ${allFailures.length - 50} more.`);
  }
  console.log(`Took ${formatDuration(seconds * 1000)}.`);
  if (stopping) {
    console.log("Stopped early — run again to continue from where this left off.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
