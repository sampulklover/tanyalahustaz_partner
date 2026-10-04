"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  LOCALE_COOKIE,
  type Locale,
} from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/server";
import { createTranslator } from "@/lib/i18n/translator";

type MessagesByLocale = Record<Locale, Messages>;

type I18nContextValue = {
  locale: Locale;
  messages: Messages;
  t: ReturnType<typeof createTranslator>;
  /** Switch language instantly in the UI; the cookie + server render follow. */
  setLocale: (nextLocale: Locale) => void;
  /** True while the server components catch up after a switch. */
  isSwitching: boolean;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  locale: initialLocale,
  messagesByLocale,
  children,
}: {
  locale: Locale;
  messagesByLocale: MessagesByLocale;
  children: ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [isSwitching, startTransition] = useTransition();

  const setLocale = useCallback(
    (nextLocale: Locale) => {
      if (nextLocale === locale) return;

      // 1. Update every client component instantly.
      setLocaleState(nextLocale);

      // 2. Persist for the next server request.
      if (typeof document !== "undefined") {
        document.cookie = `${LOCALE_COOKIE}=${nextLocale}; path=/; max-age=${
          60 * 60 * 24 * 365
        }; samesite=lax`;
      }

      // 3. Let the server components pick up the new locale in the background.
      startTransition(() => {
        router.refresh();
      });
    },
    [locale, router],
  );

  const value = useMemo(() => {
    const messages = messagesByLocale[locale];

    return {
      locale,
      messages,
      t: createTranslator(messages),
      setLocale,
      isSwitching,
    };
  }, [locale, messagesByLocale, setLocale, isSwitching]);

  return (
    <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }

  return context;
}
