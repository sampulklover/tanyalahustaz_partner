"use client";

import { useState, useTransition } from "react";
import { createApiKey, revokeApiKey } from "@/app/actions/api-keys";
import type { ApiKey } from "@/lib/types";
import { CopyButton } from "@/components/copy-button";
import { Panel } from "@/components/dashboard/panel";
import { EmptyState } from "@/components/dashboard/empty-state";
import { useI18n } from "@/lib/i18n/client";

const inputClass =
  "flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30";

export function ApiKeyManager({ keys }: { keys: ApiKey[] }) {
  const { t } = useI18n();
  const [newKeySecret, setNewKeySecret] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, startCreate] = useTransition();

  const activeKeys = keys.filter((k) => !k.revoked_at);
  const revokedKeys = keys.filter((k) => k.revoked_at);

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
    <div className="space-y-6">
      {newKeySecret && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-700 dark:bg-amber-950/30">
          <p className="font-semibold text-amber-900 dark:text-amber-200">
            {t("apiKeys.manager.copyNowTitle")}
          </p>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
            {t("apiKeys.manager.copyNowDescription")}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <code className="rounded-lg border border-amber-200 bg-card px-3 py-2 font-mono text-sm dark:border-amber-800">
              {newKeySecret}
            </code>
            <CopyButton value={newKeySecret} />
          </div>
        </div>
      )}

      <Panel title={t("apiKeys.manager.createNewKeyTitle")} description={t("apiKeys.manager.createNewKeyDescription")}>
        <form action={handleCreate} className="flex flex-col gap-3 sm:flex-row">
          <input
            name="name"
            type="text"
            required
            placeholder={t("apiKeys.manager.keyNamePlaceholder")}
            className={inputClass}
          />
          <button
            type="submit"
            disabled={isCreating}
            className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {isCreating ? t("apiKeys.manager.creating") : t("apiKeys.manager.createKey")}
          </button>
        </form>
        {createError && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{createError}</p>}
      </Panel>

      <Panel
        title={t("apiKeys.manager.activeKeysTitle")}
        description={t("apiKeys.manager.activeKeysDescription", { count: activeKeys.length })}
      >
        {activeKeys.length === 0 ? (
          <EmptyState
            title={t("apiKeys.manager.noActiveKeysTitle")}
            description={t("apiKeys.manager.noActiveKeysDescription")}
          />
        ) : (
          <ul className="divide-y divide-border">
            {activeKeys.map((key) => (
              <li
                key={key.id}
                className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{key.name}</p>
                  <p className="mt-0.5 font-mono text-sm text-[color:var(--muted)]">{key.key_prefix}••••••••</p>
                  <p className="mt-1 text-xs text-[color:var(--muted)]">
                    {t("apiKeys.manager.created", { date: new Date(key.created_at).toLocaleDateString() })}
                    {key.last_used_at &&
                      ` · ${t("apiKeys.manager.lastUsed", { date: new Date(key.last_used_at).toLocaleDateString() })}`}
                  </p>
                </div>
                <form action={revokeApiKey}>
                  <input type="hidden" name="key_id" value={key.id} />
                  <button
                    type="submit"
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30"
                  >
                    {t("apiKeys.manager.revoke")}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {revokedKeys.length > 0 && (
        <Panel title={t("apiKeys.manager.revokedKeysTitle")} description={t("apiKeys.manager.revokedKeysDescription")}>
          <ul className="divide-y divide-border opacity-60">
            {revokedKeys.map((key) => (
              <li key={key.id} className="py-3 first:pt-0 last:pb-0">
                <p className="font-medium line-through">{key.name}</p>
                <p className="font-mono text-sm text-[color:var(--muted)]">{key.key_prefix}••••••••</p>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
