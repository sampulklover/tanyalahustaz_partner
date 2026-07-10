export const locales = ["en", "ms"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const LOCALE_COOKIE = "NEXT_LOCALE";

export const localeLabels: Record<Locale, string> = {
  en: "English",
  ms: "Bahasa Melayu (Malaysia)",
};

/** Short codes shown in the language toggle (EN / BM). */
export const localeShortLabels: Record<Locale, string> = {
  en: "EN",
  ms: "BM",
};

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}
