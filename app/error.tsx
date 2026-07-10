"use client";

import { useI18n } from "@/lib/i18n/client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <h2 className="text-lg font-semibold">{t("errors.somethingWentWrong")}</h2>
      <p className="mt-2 max-w-md text-sm text-[color:var(--muted)]">
        {error.message || t("errors.unexpectedError")}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
      >
        {t("errors.tryAgain")}
      </button>
    </div>
  );
}
