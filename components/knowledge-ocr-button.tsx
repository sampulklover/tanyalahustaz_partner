"use client";

import { useActionState } from "react";
import { ocrPendingFiles } from "@/app/actions/knowledge-admin";
import { ActionToast } from "@/components/action-toast";
import { SubmitButton } from "@/components/submit-button";
import { useI18n } from "@/lib/i18n/client";

/** Runs OCR on scanned PDFs that had no text layer. Editor+ only. */
export function KnowledgeOcrButton({ pending }: { pending: number }) {
  const { t } = useI18n();
  const [state, action] = useActionState(
    async () => ocrPendingFiles(),
    {} as { error?: string; success?: string },
  );

  if (pending <= 0) return null;

  return (
    <div className="flex flex-col items-end gap-2">
      <ActionToast state={state} />
      <form action={action}>
        <SubmitButton
          pendingLabel={t("knowledge.ocr.running")}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-200 dark:hover:bg-amber-900/40"
        >
          {t("knowledge.ocr.run", { count: pending })}
        </SubmitButton>
      </form>
    </div>
  );
}
