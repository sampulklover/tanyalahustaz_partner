"use client";

import { CopyButton } from "@/components/copy-button";
import { useI18n } from "@/lib/i18n/client";

export function QuickStartSnippet({ baseUrl }: { baseUrl: string }) {
  const { t } = useI18n();
  const apiKeyPlaceholder = t("quickStart.apiKeyPlaceholder");
  const chatSnippet = `curl -X POST ${baseUrl}/api/v1/chat \\
  -H "Authorization: Bearer ${apiKeyPlaceholder}" \\
  -H "Content-Type: application/json" \\
  -d '{"message":"Can a traveler combine Dhuhr and Asr?","category":"fiqh"}'`;

  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold">{t("quickStart.title")}</h2>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            {t("quickStart.description", {
              apiKeyPlaceholder,
              apiKeysLink: t("quickStart.apiKeysLink"),
            }).split(t("quickStart.apiKeysLink"))[0]}
            <a href="/dashboard/api-keys" className="text-brand-600 hover:underline dark:text-brand-500">
              {t("quickStart.apiKeysLink")}
            </a>
            {t("quickStart.description", {
              apiKeyPlaceholder,
              apiKeysLink: t("quickStart.apiKeysLink"),
            }).split(t("quickStart.apiKeysLink"))[1]}
          </p>
        </div>
        <CopyButton value={chatSnippet} />
      </div>
      <pre className="mt-4 overflow-x-auto rounded-lg border border-border bg-background-subtle p-4 text-xs leading-relaxed">
        {chatSnippet}
      </pre>
      <p className="mt-3 font-mono text-xs text-[color:var(--muted)]">
        {t("quickStart.baseUrl", { url: baseUrl })}
      </p>
    </section>
  );
}
