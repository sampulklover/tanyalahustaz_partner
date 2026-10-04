"use client";

import { updateProfile } from "@/app/actions/account";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { useI18n } from "@/lib/i18n/client";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30";

export function SettingsProfileForm({
  fullName,
  companyName,
}: {
  fullName: string;
  companyName: string;
}) {
  const { t } = useI18n();

  return (
    <ActionForm
      action={updateProfile}
      className="space-y-5 p-5"
      successMessage={t("settings.saved")}
    >
      <div>
        <label htmlFor="full_name" className="mb-1.5 block text-sm font-medium">
          {t("settings.nameLabel")}
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          autoComplete="name"
          defaultValue={fullName}
          placeholder={t("settings.namePlaceholder")}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="company_name" className="mb-1.5 block text-sm font-medium">
          {t("settings.companyLabel")}
        </label>
        <input
          id="company_name"
          name="company_name"
          type="text"
          autoComplete="organization"
          defaultValue={companyName}
          placeholder={t("settings.companyPlaceholder")}
          className={inputClass}
        />
      </div>

      <SubmitButton
        pendingLabel={t("common.saving")}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {t("settings.save")}
      </SubmitButton>
    </ActionForm>
  );
}
