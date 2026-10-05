// One-way knowledge sync: Google Cloud Storage -> Supabase.
//
// Google Cloud is the source of truth (shared with another system), so this
// module only ever reads from the bucket and writes a read-only mirror into
// Supabase. Chat requests read the mirror and never call Google Cloud.
//
// Each run:
//   1. Lists bucket objects (optionally under GCS_PREFIX).
//   2. Filters to syncable documents, skipping images and draft folders.
//   3. Creates/updates an article per object, tracking the object generation so
//      unchanged files are skipped.
//   4. Deletes mirrored articles whose source object disappeared.
//   5. Queues embeddings for changed published articles.

import { removeArticleEmbeddings } from "@/lib/embed-knowledge";
import { estimateEmbedCost } from "@/lib/embeddings";
import {
  downloadGcsObject,
  getGcsBucketName,
  getGcsObject,
  getGcsPrefix,
  isGcsConfigured,
  listGcsObjects,
  type GcsObject,
} from "@/lib/gcs";
import { createEmbedJob } from "@/lib/knowledge-embed-jobs";
import { documentKindFromFilename, extractDocumentText, isSyncableDocument } from "@/lib/knowledge-extract";
import { generateKnowledgeFields } from "@/lib/knowledge-ai";
import {
  makeUniqueSlug,
  parseMarkdownImport,
  validateImportRow,
  type KnowledgeImportRow,
} from "@/lib/knowledge-import";
import { slugify } from "@/lib/knowledge-form";
import { logError } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import type { KnowledgeArticle } from "@/lib/types";

export const GCS_SOURCE_PROVIDER = "gcs";

const DEFAULT_MAX_FILES = Number(process.env.GCS_SYNC_MAX_FILES ?? 10);
const MAX_SYNC_BYTES = Number(process.env.GCS_SYNC_MAX_BYTES ?? 100 * 1024 * 1024);
const MIN_TEXT_LENGTH = 20;
/** Matches the importer's minimum summary length (lib/knowledge-import.ts). */
const MIN_SUMMARY_LENGTH = 10;
const DEFAULT_EXCLUDED_FOLDERS = ["cover-image", "cover", "covers"];

/** Cap on file paths stored per run for the history view (display only). */
const MAX_TRACKED_PATHS = 200;

/** AI structuring is off by default; set GCS_AI_STRUCTURING=true to re-enable. */
function aiStructuringEnabled() {
  return process.env.GCS_AI_STRUCTURING?.trim().toLowerCase() === "true";
}

/** Category taken from the top-level bucket folder, e.g. "arabic_fatwa". */
function categoryFromPath(path: string, fallback: string): string {
  const parts = path.split("/");
  if (parts.length < 2) return fallback;
  return slugify(parts[0]) || fallback;
}

/** Tags taken from the folders the file sits in. */
function tagsFromPath(path: string): string[] {
  const folders = path.split("/").slice(0, -1);
  const tags: string[] = [];

  for (const folder of folders) {
    const tag = slugify(folder);
    if (tag && !tags.includes(tag)) tags.push(tag);
  }

  return tags.slice(0, 8);
}

/** Turn a bucket filename into a readable title (no extension, words cased). */
function titleFromObjectName(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
  return base
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * A longer summary for files whose first paragraph is too short to pass the
 * importer's summary rule. Falls back to the first stretch of readable text.
 */
function cleanSummaryFallback(text: string): string {
  const collapsed = text
    .split(/\n\s*\n/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter((part) => part.length >= MIN_SUMMARY_LENGTH);

  if (collapsed.length > 0) {
    return collapsed.join(" ").slice(0, 280);
  }

  return text.replace(/\s+/g, " ").trim().slice(0, 280);
}

export type GcsSyncFailure = { path: string; error: string };

export type GcsSyncResult = {
  runId: string;
  status: "completed" | "failed";
  bucket: string;
  prefix: string | null;
  filesSeen: number;
  considered: number;
  created: number;
  updated: number;
  removed: number;
  skipped: number;
  deferred: number;
  failed: GcsSyncFailure[];
  embedJobId?: string;
  error?: string;
};

export type GcsSyncStatus = {
  configured: boolean;
  bucket: string | null;
  prefix: string | null;
};

export type SyncPreview = {
  /** Files covered by the selection that are not mirrored yet. */
  additions: number;
  /** Mirrored articles whose source file is no longer selected. */
  removals: number;
  /** How many files a single sync run will process (the per-run cap). */
  perRun: number;
  /** Rough USD cost to embed the files this run will process (the capped batch). */
  estimatedCostUsd: number;
  /** Rough USD cost to embed the whole selection, across several runs. */
  estimatedCostUsdTotal: number;
};

/**
 * Rough text-characters-per-file-byte ratio, by document kind. PDFs and DOCX
 * are compressed containers, so their on-disk size badly overstates the text
 * we actually extract and embed. Plain text/markdown is close to 1:1. These are
 * deliberately conservative guesses — the estimate only needs the right order
 * of magnitude, and the real cost is recorded from OpenRouter afterwards.
 */
const TEXT_RATIO_BY_KIND: Record<string, number> = {
  pdf: 0.12,
  docx: 0.12,
  html: 0.6,
  markdown: 0.9,
  text: 0.9,
};

const DEFAULT_TEXT_RATIO = 0.15;

function textRatioForPath(path: string): number {
  const kind = documentKindFromFilename(path);
  return (kind && TEXT_RATIO_BY_KIND[kind]) ?? DEFAULT_TEXT_RATIO;
}

/** Rough USD to embed a set of bucket objects, scaling file bytes to text. */
function estimateForObjects(objects: { name: string; size?: number | null }[]): number {
  return objects.reduce(
    (sum, object) => sum + estimateEmbedCost(object.size || 0, textRatioForPath(object.name)),
    0,
  );
}

const PREVIEW_CACHE_TTL_MS = 30_000;
const PREVIEW_MAX_OBJECTS = 10_000;
let previewCache: { at: number; key: string; preview: SyncPreview } | null = null;

export function clearSyncPreviewCache() {
  previewCache = null;
}

/**
 * What the next sync would change, so the UI can warn before running it.
 * Returns null when it would be too expensive to work out.
 */
export async function getSyncPreview(): Promise<SyncPreview | null> {
  if (!isGcsConfigured()) return null;

  const perRun = syncRunCap();
  const selections = await loadSourceSelections();
  if (selections.length === 0) {
    return { additions: 0, removals: 0, perRun, estimatedCostUsd: 0, estimatedCostUsdTotal: 0 };
  }

  const key = selections
    .map((selection) => `${selection.kind}:${selection.path}`)
    .sort()
    .join("|");

  if (previewCache && previewCache.key === key && Date.now() - previewCache.at < PREVIEW_CACHE_TTL_MS) {
    return previewCache.preview;
  }

  try {
    const objects = await gatherSelectedObjects(selections);
    if (objects.length > PREVIEW_MAX_OBJECTS) return null;

    const excluded = new Set(excludedFolders());
    const allowed = getAllowedExtensions();
    const syncable = objects
      .filter((object) => !isExcluded(object.name, excluded) && isSyncableDocument(object.name))
      .filter(
        (object) =>
          allowed.length === 0 ||
          allowed.some((extension) => object.name.toLowerCase().endsWith(extension)),
      );

    const admin = createAdminClient();
    // Paged: an unpaginated select stops at the PostgREST row cap, which would
    // make already-mirrored files look like additions.
    const mirrored = await fetchAllPages<{ source_path: string }>(() =>
      admin
        .from("knowledge_articles")
        .select("source_path")
        .eq("source_provider", GCS_SOURCE_PROVIDER)
        .not("source_path", "is", null)
        .order("id", { ascending: true }),
    );

    const mirroredPaths = mirrored.map((row) => row.source_path);

    // Too many rows to reason about reliably — skip the preview.
    if (mirroredPaths.length >= 20_000) return null;

    const mirroredSet = new Set(mirroredPaths);
    // Same order the sync loop uses, so "this run" matches what actually runs.
    const newObjects = syncable
      .filter((object) => !mirroredSet.has(object.name))
      .sort((a, b) => a.name.localeCompare(b.name));
    const additions = newObjects.length;
    // Mirror is only pruned on an explicit request, so don't advertise removals
    // a normal sync won't perform.
    const removals = 0;
    // Cost for the batch this run will actually process (capped), plus the whole
    // selection so the UI can say how much the full mirror will cost in total.
    const estimatedCostUsd = estimateForObjects(newObjects.slice(0, perRun));
    const estimatedCostUsdTotal = estimateForObjects(newObjects);

    const preview = {
      additions,
      removals,
      perRun,
      estimatedCostUsd,
      estimatedCostUsdTotal,
    };
    previewCache = { at: Date.now(), key, preview };
    return preview;
  } catch (error) {
    logError("Could not build the sync preview", error);
    return null;
  }
}

/** How many files one sync run will process (the per-run cap). */
export function syncRunCap(): number {
  return Number(process.env.GCS_SYNC_MAX_FILES ?? 10);
}

/** Optional allow-list of file types, e.g. GCS_SYNC_EXTENSIONS=.pdf */
export function getAllowedExtensions(): string[] {
  const raw = process.env.GCS_SYNC_EXTENSIONS?.trim();
  if (!raw) return [];

  return raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .map((value) => (value.startsWith(".") ? value : `.${value}`));
}

export type KnowledgeSourceSelection = { path: string; kind: "file" | "folder" };

type MirroredRow = {
  id: string;
  slug: string;
  source_path: string;
  source_etag: string | null;
  published: boolean;
};

function excludedFolders(): string[] {
  const raw = process.env.GCS_SYNC_EXCLUDE_PREFIXES?.trim();
  const list = raw
    ? raw.split(",").map((value) => value.trim()).filter(Boolean)
    : DEFAULT_EXCLUDED_FOLDERS;
  return list.map((value) => value.toLowerCase());
}

/** Skips dotfiles, `_draft`/`_wip` style folders, and known asset folders. */
function isExcluded(name: string, excluded: Set<string>): boolean {
  return name.split("/").some((part) => {
    if (!part) return false;
    if (part.startsWith(".") || part.startsWith("_")) return true;
    return excluded.has(part.toLowerCase());
  });
}

export function getGcsSyncStatus(): GcsSyncStatus {
  return {
    configured: isGcsConfigured(),
    bucket: getGcsBucketName(),
    prefix: getGcsPrefix(),
  };
}

/**
 * How many bucket files under each given folder are not mirrored yet, so the
 * picker can show "N left" per folder. Lists each folder once (cached), so this
 * is cheap on repeat loads. Returns a map of folder path -> pending count.
 */
export async function countPendingUnderFolders(
  folderPaths: string[],
): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  if (folderPaths.length === 0) return result;

  const admin = createAdminClient();
  // Paged for the same reason as the preview: an unpaginated select caps out
  // and makes mirrored files count as pending.
  const mirrored = await fetchAllPages<{ source_path: string }>(() =>
    admin
      .from("knowledge_articles")
      .select("source_path")
      .eq("source_provider", GCS_SOURCE_PROVIDER)
      .not("source_path", "is", null)
      .order("id", { ascending: true }),
  );

  const mirroredSet = new Set(mirrored.map((row) => row.source_path));

  const excluded = new Set(excludedFolders());
  const allowed = getAllowedExtensions();

  await Promise.all(
    folderPaths.map(async (folderPath) => {
      try {
        const objects = await listGcsObjects(folderPath);
        result[folderPath] = objects.filter(
          (object) =>
            !mirroredSet.has(object.name) &&
            !isExcluded(object.name, excluded) &&
            isSyncableDocument(object.name) &&
            (allowed.length === 0 ||
              allowed.some((extension) => object.name.toLowerCase().endsWith(extension))),
        ).length;
      } catch (error) {
        logError("Could not count pending files under folder", error, { folderPath });
      }
    }),
  );

  return result;
}

async function loadSourceSelections(): Promise<KnowledgeSourceSelection[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("knowledge_source_selections")
    .select("path, kind")
    .eq("provider", GCS_SOURCE_PROVIDER);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as KnowledgeSourceSelection[];
}

/**
 * Page size for reads of the whole knowledge table. PostgREST caps responses
 * (1000 rows by default), so an unpaginated select silently truncates. Any
 * query that must see *every* row has to page or it will miss the tail — which
 * made the sync re-insert rows that already existed and trip the source index.
 */
const PAGE_SIZE = 1000;
/** Hard stop so a runaway table can't spin the sync forever. */
const MAX_PAGES = 100;

/**
 * Read every row matching a query builder, one page at a time. The builder is a
 * function so each page gets a fresh query (PostgREST builders are single-use).
 */
async function fetchAllPages<T>(
  build: () => {
    range: (
      from: number,
      to: number,
    ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>;
  },
): Promise<T[]> {
  const rows: T[] = [];

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const from = page * PAGE_SIZE;
    const { data, error } = await build().range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);

    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }

  return rows;
}

/**
 * Collect the bucket objects covered by the selection. Only fetches inside the
 * chosen folders/files, so a huge bucket is never scanned end to end.
 */
async function gatherSelectedObjects(
  selections: KnowledgeSourceSelection[],
): Promise<GcsObject[]> {
  const byName = new Map<string, GcsObject>();

  // List folders concurrently: sequential calls made the preview take seconds
  // when many folders were selected.
  const folderPaths = selections.filter((s) => s.kind === "folder").map((s) => s.path);

  const listings = await Promise.all(
    folderPaths.map(async (path) => {
      try {
        return await listGcsObjects(path);
      } catch (error) {
        logError("GCS folder listing failed during gather", error, { path });
        return [];
      }
    }),
  );

  for (const objects of listings) {
    for (const object of objects) {
      byName.set(object.name, object);
    }
  }

  const filePaths = selections
    .filter((s) => s.kind === "file")
    .map((s) => s.path)
    .filter((path) => !byName.has(path));

  const files = await Promise.all(
    filePaths.map(async (path) => {
      try {
        return await getGcsObject(path);
      } catch (error) {
        logError("GCS object fetch failed during gather", error, { path });
        return null;
      }
    }),
  );

  for (const object of files) {
    if (object) byName.set(object.name, object);
  }

  return [...byName.values()];
}

/** Turn one bucket object into a validated import row. */
async function buildRowFromObject(
  object: GcsObject,
  publish: boolean,
): Promise<{ row: KnowledgeImportRow; scanned: boolean }> {
  const buffer = await downloadGcsObject(object.name);
  const text = await extractDocumentText(object.name, buffer, { maxBytes: MAX_SYNC_BYTES });

  // A PDF with almost no extractable text is a scan: flag it for OCR instead of
  // failing the file. Other empty types are genuine errors.
  if (text.length < MIN_TEXT_LENGTH) {
    if (documentKindFromFilename(object.name) === "pdf") {
      const filename = object.name.split("/").pop() ?? object.name;
      return {
        row: {
          title: filename.replace(/\.pdf$/i, ""),
          slug: slugify(filename.replace(/\.pdf$/i, "")) || "scanned-document",
          category: categoryFromPath(object.name, "general"),
          summary: "Scanned document awaiting OCR.",
          content: "This scanned PDF has no text layer yet. Run OCR to make it searchable.",
          tags: tagsFromPath(object.name),
          published: publish,
        },
        scanned: true,
      };
    }
    throw new Error("No readable text found in this file.");
  }

  const filename = object.name.split("/").pop() ?? object.name;

  if (aiStructuringEnabled()) {
    try {
      const fields = await generateKnowledgeFields({ filename, text });
      const parsed = validateImportRow(
        { ...fields, content: text, published: publish },
        1,
        { defaultPublished: publish, source: filename },
      );

      if (parsed.row) {
        return { row: parsed.row, scanned: false };
      }
    } catch (error) {
      logError("GCS sync AI structuring failed, deriving fields instead", error, {
        path: object.name,
      });
    }
  }

  // Derive fields from the document and its folder path (no model calls).
  const derived = parseMarkdownImport(text, filename, publish);
  if (!derived.row) {
    // Files whose first paragraph is too short (a bare heading, a fragment)
    // fail the summary rule. Fall back to a longer slice of the body so the
    // file still syncs instead of being reported as a failure every run.
    const fallbackSummary = cleanSummaryFallback(text);
    if (fallbackSummary.length >= MIN_SUMMARY_LENGTH) {
      const fallbackTitle = titleFromObjectName(filename);
      const retry = validateImportRow(
        {
          title: fallbackTitle,
          slug: slugify(fallbackTitle),
          category: categoryFromPath(object.name, "general"),
          summary: fallbackSummary,
          content: text,
          tags: tagsFromPath(object.name),
          published: publish,
        },
        1,
        { defaultPublished: publish, source: filename },
      );

      if (retry.row) {
        return { row: retry.row, scanned: false };
      }
    }

    throw new Error(derived.error ?? "Could not process the file.");
  }

  return {
    row: {
      ...derived.row,
      category: categoryFromPath(object.name, derived.row.category),
      tags: tagsFromPath(object.name),
    },
    scanned: false,
  };
}

export async function createRun(createdBy: string | null): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("knowledge_sync_runs")
    .insert({ provider: GCS_SOURCE_PROVIDER, status: "running", created_by: createdBy })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data.id as string;
}

/** Create a run row up front so progress can be tracked while it works. */
export async function createSyncRun(createdBy: string | null): Promise<string> {
  if (!isGcsConfigured()) {
    throw new Error(
      "Google Cloud Storage is not configured. Set GCS_SERVICE_ACCOUNT_JSON and GCS_BUCKET_NAME.",
    );
  }

  // Clear ghosts from earlier interrupted runs before adding a new one.
  await reapStaleSyncRuns();

  return createRun(createdBy);
}

async function updateRunProgress(runId: string, patch: Record<string, unknown>): Promise<void> {
  const admin = createAdminClient();
  await admin.from("knowledge_sync_runs").update(patch).eq("id", runId);
}

async function finishRun(
  runId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("knowledge_sync_runs")
    .update({ ...patch, finished_at: new Date().toISOString() })
    .eq("id", runId);
}

/** A run still marked "running" after this long is dead (server restart, timeout). */
const STALE_RUN_MS = Number(process.env.GCS_SYNC_STALE_MS ?? 20 * 60 * 1000);

/**
 * Close out runs that were interrupted mid-flight. A dev-server restart or a
 * function timeout skips `finishRun`, leaving a row stuck on "running" forever.
 * The already-mirrored files stay; only the ghost run row is marked failed.
 */
export async function reapStaleSyncRuns(): Promise<number> {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - STALE_RUN_MS).toISOString();

  const { data, error } = await admin
    .from("knowledge_sync_runs")
    .update({
      status: "failed",
      error: "Interrupted before it could finish (server restarted or timed out).",
      finished_at: new Date().toISOString(),
    })
    .eq("status", "running")
    .lt("started_at", cutoff)
    .select("id");

  if (error) {
    logError("Could not reap stale sync runs", error);
    return 0;
  }

  return data?.length ?? 0;
}

export type SyncKnowledgeFromGcsOptions = {
  createdBy?: string | null;
  maxFiles?: number;
  publish?: boolean;
  /** Reuse a run row created earlier (used for background jobs). */
  runId?: string;
  /**
   * Delete mirrored articles whose source is no longer covered by the current
   * selection. Defaults to false: without it a sync only adds and updates, so
   * unticking one file can never silently delete its already-mirrored siblings.
   */
  prune?: boolean;
};

/**
 * Pull the bucket into Supabase. Safe to call from a server action, a route
 * handler, or the cron sweeper.
 */
export async function syncKnowledgeFromGcs(
  options: SyncKnowledgeFromGcsOptions = {},
): Promise<GcsSyncResult> {
  if (!isGcsConfigured()) {
    throw new Error(
      "Google Cloud Storage is not configured. Set GCS_SERVICE_ACCOUNT_JSON and GCS_BUCKET_NAME.",
    );
  }

  const admin = createAdminClient();
  const bucket = getGcsBucketName()!;
  const publish = options.publish ?? true;
  const maxFiles = Math.max(1, options.maxFiles ?? DEFAULT_MAX_FILES);
  const prune = options.prune ?? false;

  const selections = await loadSourceSelections();
  const runId = options.runId ?? (await createRun(options.createdBy ?? null));

  // Path lists for the history view. Capped so a huge run can't bloat the row.
  const createdPaths: string[] = [];
  const updatedPaths: string[] = [];
  const removedPaths: string[] = [];

  const base = {
    runId,
    status: "completed" as const,
    bucket,
    prefix: null as string | null,
    filesSeen: 0,
    considered: 0,
    created: 0,
    updated: 0,
    removed: 0,
    skipped: 0,
    deferred: 0,
    failed: [] as GcsSyncFailure[],
  };

  try {
    if (selections.length === 0) {
      throw new Error("No sources selected. Choose folders or files to sync first.");
    }

    const objects = await gatherSelectedObjects(selections);
    base.filesSeen = objects.length;
    // Safety valve: never wipe the mirror because of an empty/auth-failed listing.
    if (objects.length === 0) {
      await finishRun(runId, { status: "completed", files_seen: 0 });
      return base;
    }

    const excluded = new Set(excludedFolders());
    const allowed = getAllowedExtensions();
    const syncable = objects
      .filter((object) => !isExcluded(object.name, excluded) && isSyncableDocument(object.name))
      .filter(
        (object) =>
          allowed.length === 0 ||
          allowed.some((extension) => object.name.toLowerCase().endsWith(extension)),
      )
      .sort((a, b) => a.name.localeCompare(b.name));

    base.considered = syncable.length;

    const [mirrored, allSlugs] = await Promise.all([
      fetchAllPages<MirroredRow>(() =>
        admin
          .from("knowledge_articles")
          .select("id, slug, source_path, source_etag, published")
          .eq("source_provider", GCS_SOURCE_PROVIDER)
          .order("id", { ascending: true }),
      ),
      fetchAllPages<{ slug: string }>(() =>
        admin.from("knowledge_articles").select("slug").order("id", { ascending: true }),
      ),
    ]);

    const mirroredByPath = new Map<string, MirroredRow>(
      mirrored.map((row) => [row.source_path, row]),
    );
    // Seed with every slug already in the table (not just mirrored ones) so a
    // new file can never collide with an article another process created.
    const usedSlugs = new Set(allSlugs.map((row) => row.slug as string));

    let processed = 0;
    const changedArticleIds: string[] = [];

    for (const object of syncable) {
      const existing = mirroredByPath.get(object.name);
      const unchanged =
        Boolean(existing) &&
        Boolean(object.generation) &&
        existing!.source_etag === object.generation;

      if (unchanged) {
        base.skipped += 1;
        continue;
      }

      if (processed >= maxFiles) {
        base.deferred += 1;
        continue;
      }
      processed += 1;

      // Record what we're working on so the UI can show live progress.
      await updateRunProgress(runId, {
        current_path: object.name,
        files_seen: base.filesSeen,
        created_count: base.created,
        updated_count: base.updated,
        skipped_count: base.skipped,
        deferred_count: base.deferred,
      });

      try {
        const { row, scanned } = await buildRowFromObject(object, existing?.published ?? publish);
        const article = await upsertArticle(admin, {
          row,
          object,
          existing,
          usedSlugs,
          scanned,
        });

        if (existing) {
          base.updated += 1;
          if (updatedPaths.length < MAX_TRACKED_PATHS) updatedPaths.push(object.name);
        } else {
          base.created += 1;
          if (createdPaths.length < MAX_TRACKED_PATHS) createdPaths.push(object.name);
        }

        // Include unpublished too: the embed job clears stale chunks for them.
        changedArticleIds.push(article.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Sync failed for this file.";
        base.failed.push({ path: object.name, error: message });
        logError("GCS sync file failed", error, { path: object.name });
      }
    }

    // Remove articles whose source object is gone from the bucket. Guarded by
    // `considered > 0` so a filter that matches nothing can never wipe the
    // mirror, and by `prune` so a selection change never deletes implicitly.
    const currentPaths = new Set(syncable.map((object) => object.name));
    const deletions = prune && base.considered > 0 ? [...mirroredByPath] : [];
    for (const [path, row] of deletions) {
      if (currentPaths.has(path)) continue;

      try {
        await removeArticleEmbeddings(row.id);
        const { error } = await admin.from("knowledge_articles").delete().eq("id", row.id);
        if (error) throw new Error(error.message);
        base.removed += 1;
        if (removedPaths.length < MAX_TRACKED_PATHS) removedPaths.push(path);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not remove article.";
        base.failed.push({ path, error: message });
        logError("GCS sync delete failed", error, { path });
      }
    }

    let embedJobId: string | undefined;
    if (changedArticleIds.length > 0) {
      embedJobId = await createEmbedJob(changedArticleIds, options.createdBy ?? null);
    }

    await finishRun(runId, {
      status: "completed",
      files_seen: base.filesSeen,
      created_count: base.created,
      updated_count: base.updated,
      removed_count: base.removed,
      skipped_count: base.skipped,
      deferred_count: base.deferred,
      failed: base.failed,
      created_paths: createdPaths,
      updated_paths: updatedPaths,
      removed_paths: removedPaths,
      embed_job_id: embedJobId ?? null,
    });

    return { ...base, embedJobId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed.";
    logError("GCS sync run failed", error, { runId });

    await finishRun(runId, {
      status: "failed",
      files_seen: base.filesSeen,
      created_count: base.created,
      updated_count: base.updated,
      removed_count: base.removed,
      skipped_count: base.skipped,
      deferred_count: base.deferred,
      failed: base.failed,
      created_paths: createdPaths,
      updated_paths: updatedPaths,
      removed_paths: removedPaths,
      error: message,
    });

    return { ...base, status: "failed", error: message };
  }
}

async function upsertArticle(
  admin: ReturnType<typeof createAdminClient>,
  {
    row,
    object,
    existing,
    usedSlugs,
    scanned = false,
  }: {
    row: KnowledgeImportRow;
    object: GcsObject;
    existing?: MirroredRow;
    usedSlugs: Set<string>;
    scanned?: boolean;
  },
): Promise<KnowledgeArticle> {
  const payload = {
    title: row.title,
    category: row.category,
    summary: row.summary,
    content: row.content,
    tags: row.tags,
    published: row.published,
    source_provider: GCS_SOURCE_PROVIDER,
    source_path: object.name,
    source_etag: object.generation || null,
    source_synced_at: new Date().toISOString(),
    source_size: object.size,
    // A scan is pending OCR; a text file clears any stale flag.
    ocr_status: scanned ? "pending" : null,
  };

  if (existing) {
    // Reserve the existing slug so no new file picks it, then keep it so source
    // citations stay stable across re-syncs.
    usedSlugs.add(existing.slug);
    const { data, error } = await admin
      .from("knowledge_articles")
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return data as KnowledgeArticle;
  }

  // Two bucket files can slugify to the same value. `usedSlugs` pre-reserves
  // every known slug, but a race or a stale snapshot can still hit the unique
  // index, so retry with a suffixed slug before giving up on the file.
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug = makeUniqueSlug(row.slug, usedSlugs);
    const { data, error } = await admin
      .from("knowledge_articles")
      .insert({ ...payload, slug })
      .select("*")
      .single();

    if (!error) return data as KnowledgeArticle;

    lastError = new Error(error.message);
    if (error.code !== "23505") break;
  }

  throw lastError ?? new Error("Could not insert the article.");
}
