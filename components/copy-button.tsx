"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/client";

export function CopyButton({
  value,
  label,
  className = "",
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const displayLabel = label ?? t("common.copy");

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`rounded-lg border border-border px-2.5 py-1 text-xs font-medium transition hover:bg-background-subtle ${className}`}
    >
      {copied ? t("common.copied") : displayLabel}
    </button>
  );
}
