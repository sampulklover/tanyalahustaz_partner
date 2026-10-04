"use client";

import { useState } from "react";
import { signOut } from "@/app/actions/auth";
import { SubmitButton } from "@/components/submit-button";
import { useI18n } from "@/lib/i18n/client";

export function SignOutButton() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[color:var(--muted)] transition hover:bg-background-subtle hover:text-foreground"
      >
        {t("dashboard.signOut")}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t("dashboard.signOutConfirmTitle")}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label={t("common.close")}
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h2 className="text-lg font-semibold">
              {t("dashboard.signOutConfirmTitle")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[color:var(--muted)]">
              {t("dashboard.signOutConfirm")}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition hover:bg-background-subtle"
              >
                {t("common.cancel")}
              </button>
              <form action={signOut}>
                <SubmitButton className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60">
                  {t("dashboard.signOutConfirmCta")}
                </SubmitButton>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
