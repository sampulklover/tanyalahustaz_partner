const SESSION_STORAGE_KEY = "tlh.playground.sessionId";
const API_KEY_STORAGE_KEY = "tlh.playground.apiKey";

/**
 * Scope the stored session id to the signed-in user, so switching accounts
 * doesn't try to restore another user's conversation (which shows empty and
 * looks broken). The userId is the Supabase auth id.
 */
function sessionKey(userId?: string) {
  return userId ? `${SESSION_STORAGE_KEY}:${userId}` : SESSION_STORAGE_KEY;
}

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

export function readStoredPlaygroundSessionId(userId?: string) {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(sessionKey(userId))?.trim() ?? "";
  } catch {
    return "";
  }
}

export function writeStoredPlaygroundSessionId(sessionId: string, userId?: string) {
  if (typeof window === "undefined") return;
  try {
    const trimmed = sessionId.trim();
    if (!trimmed) {
      window.localStorage.removeItem(sessionKey(userId));
      return;
    }
    window.localStorage.setItem(sessionKey(userId), trimmed);
  } catch {
    // Ignore storage failures (private mode, quota, etc).
  }
}

export function clearStoredPlaygroundSessionId(userId?: string) {
  writeStoredPlaygroundSessionId("", userId);
}
