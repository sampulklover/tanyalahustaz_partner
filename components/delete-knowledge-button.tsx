"use client";

import { deleteKnowledgeArticle } from "@/app/actions/knowledge-admin";

export function DeleteKnowledgeButton({ articleId }: { articleId: string }) {
  const deleteAction = deleteKnowledgeArticle.bind(null, articleId);

  return (
    <form
      action={deleteAction}
      onSubmit={(event) => {
        if (!confirm("Delete this article and its embeddings? This cannot be undone.")) {
          event.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="rounded-lg border border-red-200 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30"
      >
        Delete
      </button>
    </form>
  );
}
