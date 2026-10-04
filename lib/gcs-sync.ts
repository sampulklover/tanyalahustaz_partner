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
import { extractDocumentText, isSyncableDocument } from "@/lib/knowledge-extract";
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
const DEFAULT_EXCLUDED_FOLDERS = ["cover-image", "cover", "covers"];

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
};

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

  const selections = await loadSourceSelections();
  if (selections.length === 0) return { additions: 0, removals: 0 };

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
    const { data: mirrored } = await admin
      .from("knowledge_articles")
      .select("source_path")
      .eq("source_provider", GCS_SOURCE_PROVIDER)
      .not("source_path", "is", null)
      .limit(20_000);

    const mirroredPaths = ((mirrored ?? []) as { source_path: string }[]).map(
      (row) => row.source_path,
    );

    // Too many rows to reason about reliably — skip the preview.
    if (mirroredPaths.length >= 20_000) return null;

    const mirroredSet = new Set(mirroredPaths);
    const additions = syncable.filter((object) => !mirroredSet.has(object.name)).length;
    // Mirror is only pruned on an explicit request, so don't advertise removals
    // a normal sync won't perform.
    const removals = 0;

    const preview = { additions, removals };
    previewCache = { at: Date.now(), key, preview };
    return preview;
  } catch (error) {
    logError("Could not build the sync preview", error);
    return null;
  }
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
async function buildRowFromObject(object: GcsObject, publish: boolean): Promise<KnowledgeImportRow> {
  const buffer = await downloadGcsObject(object.name);
  const text = await extractDocumentText(object.name, buffer, { maxBytes: MAX_SYNC_BYTES });

  if (text.length < MIN_TEXT_LENGTH) {
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
        return parsed.row;
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
    throw new Error(derived.error ?? "Could not process the file.");
  }

  return {
    ...derived.row,
    category: categoryFromPath(object.name, derived.row.category),
    tags: tagsFromPath(object.name),
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

    const [{ data: mirrored, error: mirroredError }, { data: allSlugs, error: slugsError }] =
      await Promise.all([
        admin
          .from("knowledge_articles")
          .select("id, slug, source_path, source_etag, published")
          .eq("source_provider", GCS_SOURCE_PROVIDER),
        admin.from("knowledge_articles").select("slug"),
      ]);

    if (mirroredError) throw new Error(mirroredError.message);
    if (slugsError) throw new Error(slugsError.message);

    const mirroredByPath = new Map<string, MirroredRow>(
      ((mirrored ?? []) as MirroredRow[]).map((row) => [row.source_path, row]),
    );
    const usedSlugs = new Set((allSlugs ?? []).map((row) => row.slug as string));

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
        const row = await buildRowFromObject(object, existing?.published ?? publish);
        const article = await upsertArticle(admin, {
          row,
          object,
          existing,
          usedSlugs,
        });

        if (existing) {
          base.updated += 1;
        } else {
          base.created += 1;
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
  }: {
    row: KnowledgeImportRow;
    object: GcsObject;
    existing?: MirroredRow;
    usedSlugs: Set<string>;
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
  };

  if (existing) {
    // Keep the existing slug so source citations stay stable across re-syncs.
    const { data, error } = await admin
      .from("knowledge_articles")
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return data as KnowledgeArticle;
  }

  const slug = makeUniqueSlug(row.slug, usedSlugs);
  const { data, error } = await admin
    .from("knowledge_articles")
    .insert({ ...payload, slug })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as KnowledgeArticle;
}
