"use client";

import { useState } from "react";

/**
 * Prompt editor textarea with a live character counter.
 *
 * The admin prompt is capped (PROMPT_MAX_CHARS) so it stays cheap to send on
 * every turn. Without a visible counter, admins only learn about the limit when
 * a save fails — this shows the budget up front and blocks over-typing.
 */
export function PromptTextarea({
  name,
  defaultValue,
  maxLength,
  rows = 16,
  disabled,
  placeholder,
  counterLabel,
}: {
  name: string;
  defaultValue: string;
  maxLength: number;
  rows?: number;
  disabled?: boolean;
  placeholder?: string;
  /** Localised label for the counter, e.g. "characters". */
  counterLabel: string;
}) {
  const [length, setLength] = useState(defaultValue.length);
  const remaining = maxLength - length;
  const nearLimit = remaining <= 500;

  return (
    <div className="space-y-1.5">
      <textarea
        name={name}
        defaultValue={defaultValue}
        maxLength={maxLength}
        rows={rows}
        disabled={disabled}
        spellCheck={false}
        placeholder={placeholder}
        onChange={(event) => setLength(event.target.value.length)}
        className="w-full rounded-lg border border-border bg-background-subtle p-4 font-mono text-xs leading-relaxed outline-none transition focus:border-brand-500 focus:bg-card disabled:opacity-60"
      />
      <p
        className={`text-right text-xs tabular-nums ${
          nearLimit ? "text-amber-600" : "text-[color:var(--muted)]"
        }`}
      >
        {length.toLocaleString()} / {maxLength.toLocaleString()} {counterLabel}
      </p>
    </div>
  );
}
