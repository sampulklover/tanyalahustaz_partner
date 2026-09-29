"use client";

import { useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n/client";

/**
 * Files / Sync sub-tabs. Both panels are already rendered on the server, so
 * switching is instant — no page reload, no re-fetch.
 */
export function KnowledgeSourcesTabs({
  initialView,
  filesView,
  syncView,
}: {
  initialView: "files" | "sync";
  filesView: ReactNode;
  syncView: ReactNode;
}) {
  const { t } = useI18n();
  const [view, setView] = useState<"files" | "sync">(initialView);

  const tabBase = "inline-flex items-center rounded-md px-4 py-1.5 text-sm font-medium transition";
  const active = "bg-brand-600 text-white";
  const idle = "text-[color:var(--muted)] hover:bg-background-subtle hover:text-foreground";

  return (
    <>
      <div className="mb-8 inline-flex rounded-lg border border-border bg-card p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setView("files")}
          className={`${tabBase} ${view === "files" ? active : idle}`}
        >
          {t("knowledge.sources.tabFiles")}
        </button>
        <button
          type="button"
          onClick={() => setView("sync")}
          className={`${tabBase} ${view === "sync" ? active : idle}`}
        >
          {t("knowledge.sources.tabSync")}
        </button>
      </div>

      <div className={view === "files" ? undefined : "hidden"}>{filesView}</div>
      <div className={view === "sync" ? undefined : "hidden"}>{syncView}</div>
    </>
  );
}
