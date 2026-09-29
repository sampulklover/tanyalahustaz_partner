"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { THEME_STORAGE_KEY, type ThemePreference } from "@/lib/theme";

export type { ThemePreference };

export type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  /** What the user chose: light, dark, or follow the OS. */
  theme: ThemePreference;
  /** What is actually painted right now. */
  resolvedTheme: ResolvedTheme;
  setTheme: (next: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Fired when the preference changes in this tab (the `storage` event only fires cross-tab). */
const THEME_CHANGE_EVENT = "tlh-theme-change";

const SERVER_SNAPSHOT = "system|light";

function readPreference(): ThemePreference {
  if (typeof window === "undefined") return "system";

  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (value === "light" || value === "dark" || value === "system") {
      return value;
    }
  } catch {
    // localStorage unavailable (private mode) — fall back to the OS.
  }

  return "system";
}

function prefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  return preference === "system" ? (prefersDark() ? "dark" : "light") : preference;
}

function applyTheme(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;
}

/** Snapshot encodes both the preference and what it resolves to, so OS changes re-render. */
function getSnapshot(): string {
  const preference = readPreference();
  return `${preference}|${resolveTheme(preference)}`;
}

function getServerSnapshot(): string {
  return SERVER_SNAPSHOT;
}

function subscribe(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const media = window.matchMedia("(prefers-color-scheme: dark)");

  const onMediaChange = () => {
    applyTheme(resolveTheme(readPreference()));
    onStoreChange();
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === THEME_STORAGE_KEY) onStoreChange();
  };

  media.addEventListener("change", onMediaChange);
  window.addEventListener("storage", onStorage);
  window.addEventListener(THEME_CHANGE_EVENT, onStoreChange);

  return () => {
    media.removeEventListener("change", onMediaChange);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange);
  };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [preference, resolved] = snapshot.split("|");

  const theme = preference as ThemePreference;
  const resolvedTheme = resolved as ResolvedTheme;

  // Keep <html> in step with the resolved value (covers the case where the
  // inline <head> script could not run, e.g. a strict CSP).
  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = useCallback((next: ThemePreference) => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Ignore storage failures; the visual change still applies.
    }

    applyTheme(resolveTheme(next));
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
