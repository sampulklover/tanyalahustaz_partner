/**
 * Helpers for deciding whether a bucket path is already mirrored.
 *
 * A path counts as synced when it is itself a mirrored source path, or when it
 * sits under a folder that is mirrored — because mirroring a folder covers
 * every file inside it.
 */

/** Split a path into its cumulative ancestor paths, longest last. */
function ancestorPaths(path: string): string[] {
  const parts = path.split("/");
  const prefixes: string[] = [];
  for (let index = 1; index < parts.length; index += 1) {
    prefixes.push(parts.slice(0, index).join("/"));
  }
  return prefixes;
}

/** True when `path` or any of its parent folders is in `syncedSet`. */
export function isPathSynced(path: string, syncedSet: Set<string>): boolean {
  if (syncedSet.has(path)) return true;
  return ancestorPaths(path).some((prefix) => syncedSet.has(prefix));
}

/** How many synced files live directly under `folderPath`. */
export function syncedCountUnder(folderPath: string, syncedPaths: string[]): number {
  const prefix = `${folderPath}/`;
  let count = 0;
  for (const path of syncedPaths) {
    if (path.startsWith(prefix)) count += 1;
  }
  return count;
}
