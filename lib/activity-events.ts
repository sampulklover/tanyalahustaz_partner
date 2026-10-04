// Lets the Sync button hand a run over to the shared activity panel.

export const SYNC_STARTED_EVENT = "tanyalahustaz:sync-started";

export function emitSyncStarted(runId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<string>(SYNC_STARTED_EVENT, { detail: runId }));
}

export function onSyncStarted(handler: (runId: string) => void) {
  if (typeof window === "undefined") return () => {};

  const listener = (event: Event) => {
    const detail = (event as CustomEvent<string>).detail;
    if (detail) handler(detail);
  };

  window.addEventListener(SYNC_STARTED_EVENT, listener);
  return () => window.removeEventListener(SYNC_STARTED_EVENT, listener);
}

/** Fired when a run finishes, so counts and previews can refresh. */
export const SYNC_FINISHED_EVENT = "tanyalahustaz:sync-finished";

export function emitSyncFinished() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SYNC_FINISHED_EVENT));
}

export function onSyncFinished(handler: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(SYNC_FINISHED_EVENT, handler);
  return () => window.removeEventListener(SYNC_FINISHED_EVENT, handler);
}
