"use client";

import { useState } from "react";
import { useToast } from "@/components/toast";
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
  const { success, error } = useToast();
  const [copied, setCopied] = useState(false);
  const displayLabel = label ?? t("common.copy");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      success(t("common.copied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      error(t("common.copyFailed"));
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium transition hover:bg-background-subtle ${className}`}
    >
      {copied ? t("common.copied") : displayLabel}
    </button>
  );
}
