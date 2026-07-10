import { cookies } from "next/headers";
import en from "@/messages/en.json";
import ms from "@/messages/ms.json";
import {
  defaultLocale,
  isLocale,
  LOCALE_COOKIE,
  type Locale,
} from "@/lib/i18n/config";
import { createTranslator } from "@/lib/i18n/translator";

const dictionaries = {
  en,
  ms,
} as const;

export type Messages = (typeof dictionaries)[Locale];

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const value = cookieStore.get(LOCALE_COOKIE)?.value;

  if (value && isLocale(value)) {
    return value;
  }

  return defaultLocale;
}

export async function getMessages(locale?: Locale): Promise<Messages> {
  const resolvedLocale = locale ?? (await getLocale());
  return dictionaries[resolvedLocale];
}

export async function getTranslations(locale?: Locale) {
  const messages = await getMessages(locale);
  return createTranslator(messages);
}
