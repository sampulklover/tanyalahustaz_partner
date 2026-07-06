"use client";

import { useActionState } from "react";
import { reembedAllKnowledge } from "@/app/actions/knowledge-admin";

export function KnowledgeReembedButton() {
  const [state, action, isPending] = useActionState(
    async (_prev: { error?: string; success?: string }) => reembedAllKnowledge(),
    {},
  );

  return (
    <div className="flex flex-col items-end gap-2">
      <form action={action}>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          {isPending ? "Re-embedding…" : "Re-embed all published"}
        </button>
      </form>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state.success && <p className="text-xs text-emerald-600">{state.success}</p>}
    </div>
  );
}
