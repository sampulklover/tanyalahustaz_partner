/**
 * Theme plumbing shared by the server-rendered init script and the client
 * provider. Kept dependency-free so both sides import the same values.
 */

export const THEME_STORAGE_KEY = "tlh-theme";

export type ThemePreference = "light" | "dark" | "system";

/**
 * Runs in <head> during HTML parsing (before first paint). Reads the saved
 * preference and the OS setting, then sets `data-theme` on <html> so there is
 * no flash of the wrong theme. Mirrors ThemeProvider's resolve logic.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var k=${JSON.stringify(
  THEME_STORAGE_KEY,
)};var p=localStorage.getItem(k);var m=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches;var r=(p==="light"||p==="dark")?p:(m?"dark":"light");var e=document.documentElement;e.setAttribute("data-theme",r);e.style.colorScheme=r;}catch(e){}})();`;
