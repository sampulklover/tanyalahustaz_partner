"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleSourceSelection } from "@/app/actions/knowledge-sources";
import { useI18n } from "@/lib/i18n/client";
import { emitSourceSelection, onSourceSelection } from "@/lib/selection-events";

/**
 * Source picker checkbox. Updates instantly (optimistic) and broadcasts the
 * change so the "Selected sources" panel reacts without a page reload.
 */
export function KnowledgeSourceToggle({
  path,
  kind,
  selected,
  variant = "checkbox",
}: {
  path: string;
  kind: "file" | "folder";
  selected: boolean;
  variant?: "checkbox" | "remove";
}) {
  const { t } = useI18n();
  const router = useRouter();

  // Optimistic override: shows instantly, then falls back to the server value
  // once a background refresh confirms it.
  const [override, setOverride] = useState<boolean | null>(null);
  const [, startTransition] = useTransition();
  const checked = override ?? selected;

  if (override !== null && selected === override) {
    setOverride(null);
  }

  // Keep in step with changes made elsewhere (panel remove / clear all).
  useEffect(() => {
    return onSourceSelection((event) => {
      if (event.type === "clear") {
        setOverride(false);
        return;
      }
      if (event.type === "set" && event.path === path) {
        setOverride(event.selected);
      }
    });
  }, [path]);

  function toggle() {
    const next = !checked;
    setOverride(next);
    emitSourceSelection({ type: "set", path, kind, selected: next });

    const formData = new FormData();
    formData.set("path", path);
    formData.set("kind", kind);
    formData.set("selected", next ? "true" : "false");

    startTransition(async () => {
      try {
        await toggleSourceSelection(formData);
        router.refresh();
      } catch {
        setOverride(null);
        emitSourceSelection({ type: "set", path, kind, selected: !next });
      }
    });
  }

  if (variant === "remove") {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={t("knowledge.sources.picker.remove")}
        className="rounded-md px-1.5 py-0.5 text-xs font-medium text-red-600 transition hover:bg-red-50 active:scale-95 dark:text-red-400 dark:hover:bg-red-950/40"
      >
        ✕
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={checked}
      aria-label={
        checked ? t("knowledge.sources.picker.remove") : t("knowledge.sources.picker.add")
      }
      title={checked ? t("knowledge.sources.picker.remove") : t("knowledge.sources.picker.add")}
      className={
        checked
          ? "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-brand-600 bg-brand-600 text-[11px] font-bold text-white transition active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          : "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-border text-[11px] font-bold text-transparent transition hover:border-brand-500 hover:bg-background-subtle hover:text-[color:var(--muted)] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      }
    >
      ✓
    </button>
  );
}
