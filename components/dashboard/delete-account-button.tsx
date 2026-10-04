"use client";

import { useActionState, useState } from "react";
import { deleteAccount } from "@/app/actions/account";
import { Spinner } from "@/components/spinner";
import { useI18n } from "@/lib/i18n/client";

type DeleteState = { error?: string };

export function DeleteAccountButton() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<DeleteState, FormData>(
    async () => {
      const result = await deleteAccount();
      return result ?? {};
    },
    {},
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-lg border border-red-300 px-5 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
      >
        {t("settings.deleteButton")}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t("settings.deleteConfirmTitle")}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label={t("common.close")}
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h2 className="text-lg font-semibold">{t("settings.deleteConfirmTitle")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[color:var(--muted)]">
              {t("settings.deleteConfirmBody")}
            </p>
            {state.error && (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                {state.error}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition hover:bg-background-subtle"
              >
                {t("common.cancel")}
              </button>
              <form action={formAction}>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending && <Spinner className="h-4 w-4" />}
                  {t("settings.deleteConfirmCta")}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
