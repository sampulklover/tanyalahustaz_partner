"use client";

import { deleteKnowledgeArticle } from "@/app/actions/knowledge-admin";
import { useI18n } from "@/lib/i18n/client";

export function DeleteKnowledgeButton({ articleId }: { articleId: string }) {
  const { t } = useI18n();
  const deleteAction = deleteKnowledgeArticle.bind(null, articleId);

  return (
    <form
      action={deleteAction}
      onSubmit={(event) => {
        if (!confirm(t("knowledge.deleteConfirm"))) {
          event.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="rounded-lg border border-red-200 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30"
      >
        {t("common.delete")}
      </button>
    </form>
  );
}
