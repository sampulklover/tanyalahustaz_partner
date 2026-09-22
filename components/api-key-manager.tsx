"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { createApiKey } from "@/app/actions/api-keys";
import type { ApiKey } from "@/lib/types";
import { ApiKeyActions } from "@/components/api-key-actions";
import { CopyButton } from "@/components/copy-button";
import { useI18n } from "@/lib/i18n/client";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30";

const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60";

const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition hover:bg-background-subtle";

function formatRelativeTime(iso: string, now: number, locale: string) {
  const seconds = Math.round((now - new Date(iso).getTime()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const abs = Math.abs(seconds);

  if (abs < 45) return formatter.format(-seconds, "second");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return formatter.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(-hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return formatter.format(-days, "day");
  const months = Math.round(days / 30);
  if (Math.abs(months) < 12) return formatter.format(-months, "month");
  return formatter.format(-Math.round(months / 12), "year");
}

export function ApiKeyManager({
  keys,
  usageByKey,
  now,
}: {
  keys: ApiKey[];
  usageByKey: Record<string, number>;
  now: number;
}) {
  const { t, locale } = useI18n();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newKeySecret, setNewKeySecret] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, startCreate] = useTransition();
  const [query, setQuery] = useState("");

  const ordered = useMemo(() => {
    const active = keys.filter((key) => !key.revoked_at);
    const revoked = keys.filter((key) => key.revoked_at);
    return [...active, ...revoked];
  }, [keys]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return ordered;
    return ordered.filter(
      (key) =>
        key.name.toLowerCase().includes(term) ||
        key.key_prefix.toLowerCase().includes(term),
    );
  }, [ordered, query]);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setCreateError(null);
    setNewKeySecret(null);
  }, []);

  const openDialog = useCallback(() => {
    setCreateError(null);
    setNewKeySecret(null);
    setDialogOpen(true);
  }, []);

  useEffect(() => {
    if (!dialogOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeDialog();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dialogOpen, closeDialog]);

  function handleCreate(formData: FormData) {
    setCreateError(null);
    startCreate(async () => {
      const result = await createApiKey(formData);
      if (result.error) {
        setCreateError(result.error);
        return;
      }
      if (result.key) {
        setNewKeySecret(result.key.secret);
      }
    });
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t("pages.apiKeys.title")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[color:var(--muted)] sm:text-base">
            {t("pages.apiKeys.description")}
          </p>
        </div>
        <button type="button" onClick={openDialog} className={primaryButtonClass}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
          {t("apiKeys.manager.createNew")}
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border p-4">
          <div className="relative max-w-sm">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--muted)]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("apiKeys.manager.searchPlaceholder")}
              className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
            />
          </div>
        </div>

        {ordered.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <p className="font-medium">{t("apiKeys.manager.noActiveKeysTitle")}</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-[color:var(--muted)]">
              {t("apiKeys.manager.noActiveKeysDescription")}
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-14 text-center text-sm text-[color:var(--muted)]">
            {t("apiKeys.manager.noMatches")}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-[color:var(--muted)]">
                  <tr className="border-b border-border">
                    <th className="px-5 py-3 font-medium">{t("apiKeys.manager.table.key")}</th>
                    <th className="px-5 py-3 font-medium">{t("apiKeys.manager.table.created")}</th>
                    <th className="px-5 py-3 font-medium">{t("apiKeys.manager.table.lastUsed")}</th>
                    <th className="px-5 py-3 font-medium">{t("apiKeys.manager.table.usage")}</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((key) => {
                    const revoked = Boolean(key.revoked_at);
                    const count = usageByKey[key.id] ?? 0;
                    return (
                      <tr
                        key={key.id}
                        className="border-b border-border transition last:border-0 hover:bg-background-subtle/40"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={
                                revoked
                                  ? "font-medium text-[color:var(--muted)] line-through"
                                  : "font-medium"
                              }
                            >
                              {key.name}
                            </span>
                            {revoked && (
                              <span className="rounded-full bg-background-subtle px-2 py-0.5 text-xs text-[color:var(--muted)]">
                                {t("apiKeys.manager.table.revoked")}
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 font-mono text-xs text-[color:var(--muted)]">
                            {key.key_prefix}••••••••
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-[color:var(--muted)]">
                          {new Date(key.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-[color:var(--muted)]">
                          {key.last_used_at
                            ? formatRelativeTime(key.last_used_at, now, locale)
                            : t("apiKeys.manager.table.never")}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-[color:var(--muted)]">
                          {t("apiKeys.manager.requests", { count })}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <ApiKeyActions keyId={key.id} revoked={revoked} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="border-t border-border px-5 py-3 text-xs text-[color:var(--muted)]">
              {t("apiKeys.manager.keyCount", { count: filtered.length })}
            </div>
          </>
        )}
      </div>

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label={t("common.close")}
            onClick={closeDialog}
            className="absolute inset-0 bg-black/50"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="api-key-dialog-title"
            className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl"
          >
            {newKeySecret ? (
              <>
                <h2 id="api-key-dialog-title" className="text-lg font-semibold">
                  {t("apiKeys.manager.copyNowTitle")}
                </h2>
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  {t("apiKeys.manager.copyNowDescription")}
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-lg border border-border bg-background-subtle px-3 py-2 font-mono text-sm">
                    {newKeySecret}
                  </code>
                  <CopyButton value={newKeySecret} />
                </div>
                <button
                  type="button"
                  onClick={closeDialog}
                  className={`mt-5 w-full ${primaryButtonClass}`}
                >
                  {t("common.close")}
                </button>
              </>
            ) : (
              <form action={handleCreate}>
                <h2 id="api-key-dialog-title" className="text-lg font-semibold">
                  {t("apiKeys.manager.createNew")}
                </h2>
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  {t("apiKeys.manager.createNewKeyDescription")}
                </p>
                <div className="mt-4">
                  <label htmlFor="api-key-name" className="mb-1.5 block text-sm font-medium">
                    {t("apiKeys.manager.table.name")}
                  </label>
                  <input
                    id="api-key-name"
                    name="name"
                    type="text"
                    required
                    autoFocus
                    placeholder={t("apiKeys.manager.keyNamePlaceholder")}
                    className={inputClass}
                  />
                </div>
                {createError && (
                  <p className="mt-3 text-sm text-red-600 dark:text-red-400">{createError}</p>
                )}
                <div className="mt-5 flex justify-end gap-2">
                  <button type="button" onClick={closeDialog} className={secondaryButtonClass}>
                    {t("common.cancel")}
                  </button>
                  <button type="submit" disabled={isCreating} className={primaryButtonClass}>
                    {isCreating ? t("apiKeys.manager.creating") : t("apiKeys.manager.createKey")}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
