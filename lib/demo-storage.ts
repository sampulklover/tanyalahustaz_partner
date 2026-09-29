const API_KEY_STORAGE_KEY = "tlh.demo.apiKey";

/**
 * Demo API key lives in sessionStorage: it is scoped to the tab and cleared
 * when the tab closes, which is the right lifetime for a key a partner pastes
 * in to try the API from a mock external site.
 */
export function readStoredDemoKey() {
  if (typeof window === "undefined") return "";
  try {
    return window.sessionStorage.getItem(API_KEY_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function writeStoredDemoKey(value: string) {
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
