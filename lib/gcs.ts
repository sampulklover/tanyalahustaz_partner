// Read-only Google Cloud Storage access for the knowledge sync.
//
// Credentials come from a service account JSON key held in the server env
// (GCS_SERVICE_ACCOUNT_JSON). The key only needs roles/storage.objectViewer on
// the one bucket. It is never sent to the browser.

import { Storage } from "@google-cloud/storage";

export type GcsObject = {
  /** Full object path within the bucket, e.g. "Fiqh/jamak-solat.pdf". */
  name: string;
  size: number;
  /** Changes whenever the object's content changes — used to detect edits. */
  generation: string;
  updated: string | null;
};

const PLACEHOLDER_VALUES = new Set(["", "your-service-account-json"]);

function readServiceAccount(): Record<string, unknown> | null {
  const raw = process.env.GCS_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw || PLACEHOLDER_VALUES.has(raw)) return null;

  // Accept either raw JSON or a base64-encoded copy (handy in hosting dashboards).
  const text = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf-8");

  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    throw new Error("GCS_SERVICE_ACCOUNT_JSON is not valid JSON.");
  }
}

export function getGcsBucketName(): string | null {
  const bucket = process.env.GCS_BUCKET_NAME?.trim();
  return bucket || null;
}

/** Optional folder prefix so only part of the bucket is synced. */
export function getGcsPrefix(): string | null {
  const prefix = process.env.GCS_PREFIX?.trim();
  if (!prefix) return null;
  return prefix.replace(/^\/+|\/+$/g, "");
}

export function isGcsConfigured(): boolean {
  return Boolean(getGcsBucketName() && readServiceAccount());
}

function getStorage(): Storage {
  const credentials = readServiceAccount();
  if (!credentials) {
    throw new Error(
      "Google Cloud Storage is not configured. Set GCS_SERVICE_ACCOUNT_JSON and GCS_BUCKET_NAME.",
    );
  }

  return new Storage({
    credentials,
    projectId:
      typeof credentials.project_id === "string" ? credentials.project_id : undefined,
  });
}

// Full-prefix listings are used by the sync/preview, which re-lists every
// selected folder. Cache per prefix so repeated previews don't re-hit GCS.
const objectCache = new Map<string, { at: number; objects: GcsObject[] }>();
const OBJECT_LIST_CACHE_TTL_MS = 60_000;

export function clearGcsObjectCache() {
  objectCache.clear();
}

export async function listGcsObjects(prefix?: string | null): Promise<GcsObject[]> {
  const bucketName = getGcsBucketName();
  if (!bucketName) {
    throw new Error("GCS_BUCKET_NAME is not set.");
  }

  const normalized = prefix ? `${prefix.replace(/\/+$/g, "")}/` : undefined;
  const cacheKey = normalized ?? "";

  const cached = objectCache.get(cacheKey);
  if (cached && Date.now() - cached.at < OBJECT_LIST_CACHE_TTL_MS) {
    return cached.objects;
  }

  const [files] = await getStorage().bucket(bucketName).getFiles({
    prefix: normalized,
    autoPaginate: true,
  });

  const objects = files.map((file) => ({
    name: file.name,
    size: Number(file.metadata.size ?? 0),
    generation: String(file.metadata.generation ?? ""),
    updated: typeof file.metadata.updated === "string" ? file.metadata.updated : null,
  }));

  objectCache.set(cacheKey, { at: Date.now(), objects });
  return objects;
}

export async function downloadGcsObject(name: string): Promise<Buffer> {
  const bucketName = getGcsBucketName();
  if (!bucketName) {
    throw new Error("GCS_BUCKET_NAME is not set.");
  }

  const [contents] = await getStorage().bucket(bucketName).file(name).download();
  return contents;
}

export type GcsFileStream = {
  stream: NodeJS.ReadableStream;
  contentType: string;
  size: number;
};

/**
 * Open a readable stream for one object, so the server can pipe the real file
 * to the browser without buffering it all in memory.
 */
export async function streamGcsObject(
  name: string,
  range?: { start: number; end: number } | null,
): Promise<GcsFileStream | null> {
  const bucketName = getGcsBucketName();
  if (!bucketName) {
    throw new Error("GCS_BUCKET_NAME is not set.");
  }

  const file = getStorage().bucket(bucketName).file(name);
  const [exists] = await file.exists();
  if (!exists) return null;

  const [metadata] = await file.getMetadata();
  const stream = file.createReadStream(range ?? undefined);

  return {
    stream,
    contentType:
      typeof metadata.contentType === "string"
        ? metadata.contentType
        : "application/octet-stream",
    size: Number(metadata.size ?? 0),
  };
}

export type GcsChildListing = {
  folders: { name: string; path: string }[];
  files: { name: string; path: string; size: number }[];
  truncated: boolean;
};

// Folder listings are hit on every Sources render, so cache them briefly.
const childCache = new Map<string, { at: number; listing: GcsChildListing }>();
const CHILD_CACHE_TTL_MS = 60_000;

export function clearGcsBrowseCache() {
  childCache.clear();
}

function toGcsObject(name: string, metadata: { size?: unknown; generation?: unknown; updated?: unknown }): GcsObject {
  return {
    name,
    size: Number(metadata.size ?? 0),
    generation: String(metadata.generation ?? ""),
    updated: typeof metadata.updated === "string" ? metadata.updated : null,
  };
}

/**
 * List the immediate children of a prefix (folders + files), like a file
 * browser. Uses a delimiter so we only fetch one level at a time.
 */
export async function listGcsChildren(prefix?: string | null): Promise<GcsChildListing> {
  const cacheKey = prefix ?? "";
  const cached = childCache.get(cacheKey);
  if (cached && Date.now() - cached.at < CHILD_CACHE_TTL_MS) {
    return cached.listing;
  }

  const bucketName = getGcsBucketName();
  if (!bucketName) {
    throw new Error("GCS_BUCKET_NAME is not set.");
  }

  const normalized = prefix ? `${prefix.replace(/\/+$/g, "")}/` : undefined;
  const [files, , apiResponse] = await getStorage().bucket(bucketName).getFiles({
    prefix: normalized,
    delimiter: "/",
    autoPaginate: false,
    maxResults: 1000,
  });

  const prefixes = (apiResponse as { prefixes?: string[] } | undefined)?.prefixes ?? [];
  const folders = prefixes
    .map((value) => value.replace(/\/+$/g, ""))
    .filter((value) => value && value !== prefix)
    .map((value) => ({ name: value.split("/").pop() ?? value, path: value }));

  const fileObjects = files
    .filter((file) => !file.name.endsWith("/"))
    .map((file) => ({
      name: file.name.split("/").pop() ?? file.name,
      path: file.name,
      size: Number(file.metadata.size ?? 0),
    }));

  const listing: GcsChildListing = {
    folders,
    files: fileObjects,
    truncated: fileObjects.length + folders.length >= 1000,
  };

  childCache.set(cacheKey, { at: Date.now(), listing });
  return listing;
}

/** Fetch metadata for one object, or null when it no longer exists. */
export async function getGcsObject(name: string): Promise<GcsObject | null> {
  const bucketName = getGcsBucketName();
  if (!bucketName) {
    throw new Error("GCS_BUCKET_NAME is not set.");
  }

  const file = getStorage().bucket(bucketName).file(name);
  const [exists] = await file.exists();
  if (!exists) return null;

  const [metadata] = await file.getMetadata();
  return toGcsObject(name, metadata);
}

export type GcsSearchResult = { name: string; path: string; size: number };
export type GcsSearchResponse = {
  results: GcsSearchResult[];
  total: number;
  truncated: boolean;
};

// Bucket listings are expensive, so cache the full object list briefly.
let objectListCache: { at: number; objects: GcsObject[] } | null = null;
const OBJECT_CACHE_TTL_MS = 60_000;

async function listAllGcsObjects(prefix?: string | null): Promise<GcsObject[]> {
  const now = Date.now();
  if (objectListCache && now - objectListCache.at < OBJECT_CACHE_TTL_MS) {
    return objectListCache.objects;
  }

  const objects = await listGcsObjects(prefix ?? getGcsPrefix());
  objectListCache = { at: now, objects };
  return objects;
}

/**
 * Substring search across every object path in the bucket. This lists the whole
 * bucket, so it is on-demand only (never on page load).
 */
export async function searchGcsObjects(
  query: string,
  limit = 200,
): Promise<GcsSearchResponse> {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) {
    return { results: [], total: 0, truncated: false };
  }

  const objects = await listAllGcsObjects();
  const matches = objects.filter((object) => object.name.toLowerCase().includes(needle));

  return {
    results: matches.slice(0, limit).map((object) => ({
      name: object.name.split("/").pop() ?? object.name,
      path: object.name,
      size: object.size,
    })),
    total: matches.length,
    truncated: matches.length > limit,
  };
}
