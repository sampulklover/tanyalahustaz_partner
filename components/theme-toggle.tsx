"use client";

import { useTheme, type ThemePreference } from "@/components/theme-provider";
import { useI18n } from "@/lib/i18n/client";

type ThemeToggleProps = {
  className?: string;
  variant?: "header" | "sidebar" | "menu";
};

const OPTIONS: { value: ThemePreference; labelKey: string }[] = [
  { value: "light", labelKey: "theme.light" },
  { value: "dark", labelKey: "theme.dark" },
  { value: "system", labelKey: "theme.system" },
];

function ThemeIcon({ value, className = "h-4 w-4" }: { value: ThemePreference; className?: string }) {
  if (value === "light") {
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
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
    );
  }

  if (value === "dark") {
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
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    );
  }

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
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

/**
 * Compact, icon-only segmented control. Labels are exposed via the tooltip and
 * screen-reader text so the control always fits narrow sidebars.
 */
function ThemeToggleButtons({
  active,
  onSelect,
}: {
  active: ThemePreference;
  onSelect: (value: ThemePreference) => void;
}) {
  const { t } = useI18n();

  return (
    <div
      role="group"
      aria-label={t("theme.label")}
      className="inline-flex shrink-0 items-center rounded-lg border border-border bg-background-subtle/60 p-0.5"
    >
      {OPTIONS.map((option) => {
        const isActive = active === option.value;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            title={t(option.labelKey)}
            onClick={() => onSelect(option.value)}
            className={
              isActive
                ? "flex h-7 w-8 items-center justify-center rounded-md bg-brand-50 text-brand-700 transition dark:bg-brand-900/40 dark:text-brand-200"
                : "flex h-7 w-8 items-center justify-center rounded-md text-[color:var(--muted)] transition hover:text-foreground"
            }
          >
            <ThemeIcon value={option.value} />
            <span className="sr-only">{t(option.labelKey)}</span>
          </button>
        );
      })}
    </div>
  );
}

export function ThemeToggle({ className = "", variant = "header" }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();

  const active: ThemePreference = theme;
  const onSelect = (value: ThemePreference) => setTheme(value);

  if (variant === "sidebar") {
    return (
      <div className={className}>
        <p className="mb-2 mt-6 px-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)]">
          {t("theme.label")}
        </p>
        <div className="flex items-center rounded-lg px-3 py-1.5">
          <ThemeToggleButtons active={active} onSelect={onSelect} />
        </div>
      </div>
    );
  }

  if (variant === "menu") {
    return (
      <div className={className}>
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)]">
          {t("theme.label")}
        </p>
        <div className="px-3 py-1">
          <ThemeToggleButtons active={active} onSelect={onSelect} />
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <ThemeToggleButtons active={active} onSelect={onSelect} />
    </div>
  );
}
