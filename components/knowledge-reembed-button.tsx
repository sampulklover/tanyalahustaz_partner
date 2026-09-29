"use client";

import { useActionState } from "react";
import { reembedAllKnowledge } from "@/app/actions/knowledge-admin";
import { ActionToast } from "@/components/action-toast";
import { SubmitButton } from "@/components/submit-button";
import { useI18n } from "@/lib/i18n/client";

export function KnowledgeReembedButton() {
  const { t } = useI18n();
  const [state, action] = useActionState(
    async () => reembedAllKnowledge(),
    {} as { error?: string; success?: string },
  );

  return (
    <div className="flex flex-col items-end gap-2">
      <ActionToast state={state} />
      <form action={action}>
        <SubmitButton
          pendingLabel={t("knowledge.reembed.reembedding")}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 text-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          {t("knowledge.reembed.reembedAll")}
        </SubmitButton>
      </form>
    </div>
  );
}
