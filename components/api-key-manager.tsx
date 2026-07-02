"use client";

import { useState, useTransition } from "react";
import { createApiKey, revokeApiKey } from "@/app/actions/api-keys";
import type { ApiKey } from "@/lib/types";
import { CopyButton } from "@/components/copy-button";

export function ApiKeyManager({ keys }: { keys: ApiKey[] }) {
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
    <div className="space-y-8">
      {newKeySecret && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-700 dark:bg-amber-950/30">
          <p className="font-medium text-amber-900 dark:text-amber-200">
            Save your API key now — it won&apos;t be shown again
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <code className="rounded-lg bg-white px-3 py-2 font-mono text-sm dark:bg-zinc-900">
              {newKeySecret}
            </code>
            <CopyButton value={newKeySecret} />
          </div>
        </div>
      )}

      <form action={handleCreate} className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="text-lg font-semibold">Create API key</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Give your key a name so you can identify it later (e.g. &quot;Production&quot;, &quot;Staging&quot;).
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            name="name"
            type="text"
            required
            placeholder="Key name"
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none ring-emerald-600 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="submit"
            disabled={isCreating}
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {isCreating ? "Creating…" : "Create key"}
          </button>
        </div>
        {createError && <p className="mt-3 text-sm text-red-600">{createError}</p>}
      </form>

      <section>
        <h2 className="text-lg font-semibold">Active keys</h2>
        {activeKeys.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">No active API keys yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {activeKeys.map((key) => (
              <li
                key={key.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{key.name}</p>
                  <p className="font-mono text-sm text-zinc-500">{key.key_prefix}</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    Created {new Date(key.created_at).toLocaleDateString()}
                    {key.last_used_at &&
                      ` · Last used ${new Date(key.last_used_at).toLocaleDateString()}`}
                  </p>
                </div>
                <form action={revokeApiKey}>
                  <input type="hidden" name="key_id" value={key.id} />
                  <button
                    type="submit"
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30"
                  >
                    Revoke
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {revokedKeys.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-zinc-500">Revoked keys</h2>
          <ul className="mt-4 divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {revokedKeys.map((key) => (
              <li key={key.id} className="p-4 opacity-60">
                <p className="font-medium line-through">{key.name}</p>
                <p className="font-mono text-sm">{key.key_prefix}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
