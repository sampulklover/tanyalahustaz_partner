const SESSION_STORAGE_KEY = "tlh.playground.sessionId";

export function readStoredPlaygroundSessionId() {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(SESSION_STORAGE_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

export function writeStoredPlaygroundSessionId(sessionId: string) {
  if (typeof window === "undefined") return;
  try {
    const trimmed = sessionId.trim();
    if (!trimmed) {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(SESSION_STORAGE_KEY, trimmed);
  } catch {
    // Ignore storage failures (private mode, quota, etc).
  }
}

export function clearStoredPlaygroundSessionId() {
  writeStoredPlaygroundSessionId("");
}
