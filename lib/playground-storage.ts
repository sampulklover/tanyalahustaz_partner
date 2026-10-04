const SESSION_STORAGE_KEY = "tlh.playground.sessionId";
const API_KEY_STORAGE_KEY = "tlh.playground.apiKey";

export function readStoredPlaygroundApiKey() {
  if (typeof window === "undefined") return "";
  try {
    return window.sessionStorage.getItem(API_KEY_STORAGE_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

export function writeStoredPlaygroundApiKey(value: string) {
  if (typeof window === "undefined") return;
  try {
    const trimmed = value.trim();
    if (!trimmed) {
      window.sessionStorage.removeItem(API_KEY_STORAGE_KEY);
      return;
    }
    window.sessionStorage.setItem(API_KEY_STORAGE_KEY, trimmed);
  } catch {
    // Ignore storage failures (private mode, quota, etc).
  }
}

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
