import {
  defaultLocale,
  isLocale,
  LOCALE_COOKIE,
  type Locale,
} from "@/lib/i18n/config";

export function getLocaleFromDocumentCookie(): Locale {
  if (typeof document === "undefined") {
    return defaultLocale;
  }

  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`));
  const value = match?.[1];

  if (value && isLocale(value)) {
    return value;
  }

  return defaultLocale;
}
