// Tiny client-side event bus so the source checkbox and the "Selected sources"
// panel update together instantly, without waiting for a server refresh.

export const SOURCE_SELECTION_EVENT = "tanyalahustaz:source-selection";

export type SourceSelectionEvent =
  | { type: "set"; path: string; kind: "file" | "folder"; selected: boolean }
  | { type: "clear" };

export function emitSourceSelection(event: SourceSelectionEvent) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<SourceSelectionEvent>(SOURCE_SELECTION_EVENT, { detail: event }));
}

export function onSourceSelection(handler: (event: SourceSelectionEvent) => void) {
  if (typeof window === "undefined") return () => {};

  const listener = (event: Event) => {
    const detail = (event as CustomEvent<SourceSelectionEvent>).detail;
    if (detail) handler(detail);
  };

  window.addEventListener(SOURCE_SELECTION_EVENT, listener);
  return () => window.removeEventListener(SOURCE_SELECTION_EVENT, listener);
}
