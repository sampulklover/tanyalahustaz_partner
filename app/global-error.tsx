"use client";

import { useMemo } from "react";
import en from "@/messages/en.json";
import ms from "@/messages/ms.json";
import type { Locale } from "@/lib/i18n/config";
import { getLocaleFromDocumentCookie } from "@/lib/i18n/cookie";
import { createTranslator } from "@/lib/i18n/translator";

const dictionaries = { en, ms } as const;

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale: Locale = getLocaleFromDocumentCookie();
  const t = useMemo(() => createTranslator(dictionaries[locale]), [locale]);

  return (
    <html lang={locale}>
      <body className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center text-foreground">
        <h1 className="text-xl font-semibold">{t("errors.applicationError")}</h1>
        <p className="mt-2 max-w-md text-sm opacity-70">
          {error.message || t("errors.criticalError")}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
        >
          {t("errors.tryAgain")}
        </button>
      </body>
    </html>
  );
}
