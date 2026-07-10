"use client";

import { CONSUMER_APP_NAME, CONSUMER_APP_URL } from "@/lib/brand";
import { useI18n } from "@/lib/i18n/client";

export function ConsumerAppLink() {
  const { t } = useI18n();
  const consumerUrl = CONSUMER_APP_URL.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <p className="text-center text-sm text-[color:var(--muted)]">
      {t("auth.consumerAppPrompt", { consumerApp: CONSUMER_APP_NAME })}{" "}
      <a
        href={CONSUMER_APP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-brand-600 hover:underline dark:text-brand-500"
      >
        {t("auth.consumerAppLink", { consumerUrl })}
      </a>
    </p>
  );
}
