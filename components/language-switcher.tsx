"use client";

import { useTransition } from "react";
import { setLocale } from "@/app/actions/locale";
import {
  locales,
  localeShortLabels,
  type Locale,
} from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/client";

type LanguageSwitcherProps = {
  className?: string;
  variant?: "header" | "sidebar" | "menu";
};

function GlobeIcon({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function LanguageToggle({
  locale,
  isPending,
  onChange,
  size = "sm",
}: {
  locale: Locale;
  isPending: boolean;
  onChange: (nextLocale: Locale) => void;
  size?: "sm" | "md";
}) {
  const pillClass =
    size === "sm"
      ? "min-w-[2.25rem] px-2.5 py-1 text-xs"
      : "min-w-[2.75rem] px-3 py-1.5 text-sm";

  return (
    <div
      role="group"
      className="inline-flex items-center rounded-lg border border-border bg-background-subtle/60 p-0.5"
    >
      {locales.map((value) => {
        const active = locale === value;

        return (
          <button
            key={value}
            type="button"
            disabled={isPending}
            aria-pressed={active}
            onClick={() => onChange(value)}
            className={
              active
                ? `${pillClass} rounded-md bg-brand-50 font-medium text-brand-700 transition dark:bg-brand-900/40 dark:text-brand-200`
                : `${pillClass} rounded-md font-medium text-[color:var(--muted)] transition hover:text-foreground disabled:opacity-60`
            }
          >
            {localeShortLabels[value]}
          </button>
        );
      })}
    </div>
  );
}

export function LanguageSwitcher({
  className = "",
  variant = "header",
}: LanguageSwitcherProps) {
  const { locale, t } = useI18n();
  const [isPending, startTransition] = useTransition();

  function handleChange(nextLocale: Locale) {
    if (nextLocale === locale || isPending) {
      return;
    }

    startTransition(async () => {
      await setLocale(nextLocale);
    });
  }

  if (variant === "sidebar") {
    return (
      <div className={className}>
        <p className="mb-2 mt-6 px-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)]">
          {t("language.label")}
        </p>
        <div className="flex items-center gap-3 rounded-lg px-3 py-1.5">
          <span className="text-[color:var(--muted)]">
            <GlobeIcon />
          </span>
          <LanguageToggle
            locale={locale}
            isPending={isPending}
            onChange={handleChange}
            size="md"
          />
        </div>
      </div>
    );
  }

  if (variant === "menu") {
    return (
      <div className={className}>
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)]">
          {t("language.label")}
        </p>
        <div className="flex items-center gap-3 px-3 py-1">
          <span className="text-[color:var(--muted)]">
            <GlobeIcon className="h-4 w-4" />
          </span>
          <LanguageToggle
            locale={locale}
            isPending={isPending}
            onChange={handleChange}
            size="md"
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={className}
      role="group"
      aria-label={t("language.label")}
    >
      <LanguageToggle
        locale={locale}
        isPending={isPending}
        onChange={handleChange}
        size="sm"
      />
    </div>
  );
}
