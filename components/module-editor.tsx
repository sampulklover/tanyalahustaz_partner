"use client";

import { useState } from "react";
import { useToast } from "@/components/toast";

type ActionResult = { error?: string; success?: string } | void;

/**
 * One specialty prompt module, collapsed by default, expandable to edit.
 *
 * Saving an empty value clears the override so the module falls back to the
 * built-in text in `lib/prompts/modules.ts`. A "load built-in" link fills the
 * editor with that text so it can be tweaked rather than written from scratch.
 */
export function ModuleEditor({
  moduleId,
  label,
  value,
  defaultText,
  isCustom,
  canEdit,
  maxLength,
  action,
  labels,
}: {
  moduleId: string;
  label: string;
  /** Current admin override ("" when using the built-in). */
  value: string;
  /** Built-in module text, used as placeholder and for "load built-in". */
  defaultText: string;
  isCustom: boolean;
  canEdit: boolean;
  maxLength: number;
  action: (formData: FormData) => Promise<ActionResult>;
  labels: {
    custom: string;
    builtIn: string;
    edit: string;
    collapse: string;
    save: string;
    reset: string;
    counter: string;
  };
}) {
  const { success, error } = useToast();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value);
  const [saving, setSaving] = useState(false);

  const remaining = maxLength - text.length;
  const nearLimit = remaining <= 500;

  async function submit(next: string) {
    setSaving(true);

    try {
      const formData = new FormData();
      formData.set("moduleId", moduleId);
      formData.set("modulePrompt", next);
      const result = await action(formData);

      if (result && result.error) {
        error(result.error);
      } else {
        setText(next);
        success(result && result.success ? result.success : labels.save);
      }
    } catch (submitError) {
      error(submitError instanceof Error ? submitError.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{label}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              isCustom
                ? "bg-brand-100 text-brand-700"
                : "bg-background-subtle text-[color:var(--muted)]"
            }`}
          >
            {isCustom ? labels.custom : labels.builtIn}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="text-xs font-medium text-brand-600 transition hover:underline dark:text-brand-500"
        >
          {open ? labels.collapse : labels.edit}
        </button>
      </div>

      {open && (
        <div className="space-y-3 border-t border-border p-4">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            disabled={!canEdit || saving}
            rows={14}
            spellCheck={false}
            maxLength={maxLength}
            placeholder={defaultText}
            className="w-full rounded-lg border border-border bg-background-subtle p-4 font-mono text-xs leading-relaxed outline-none transition focus:border-brand-500 focus:bg-card disabled:opacity-60"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {canEdit && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => submit(text)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "…" : labels.save}
                </button>
              )}
              <button
                type="button"
                onClick={() => setText(defaultText)}
                className="text-xs font-medium text-brand-600 transition hover:underline dark:text-brand-500"
              >
                {labels.reset}
              </button>
            </div>
            <p
              className={`text-xs tabular-nums ${
                nearLimit ? "text-amber-600" : "text-[color:var(--muted)]"
              }`}
            >
              {text.length.toLocaleString()} / {maxLength.toLocaleString()} {labels.counter}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
