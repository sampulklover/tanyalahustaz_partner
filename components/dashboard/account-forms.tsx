"use client";

import { updateEmail, updatePassword } from "@/app/actions/account";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { useI18n } from "@/lib/i18n/client";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30";

const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60";

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const { t } = useI18n();

  return (
    <ActionForm
      action={updatePassword}
      className="space-y-5 p-5"
      successMessage={t("settings.passwordSaved")}
    >
      {hasPassword && (
        <div>
          <label htmlFor="current_password" className="mb-1.5 block text-sm font-medium">
            {t("settings.currentPasswordLabel")}
          </label>
          <input
            id="current_password"
            name="current_password"
            type="password"
            autoComplete="current-password"
            required
            className={inputClass}
          />
        </div>
      )}

      <div>
        <label htmlFor="new_password" className="mb-1.5 block text-sm font-medium">
          {t("settings.newPasswordLabel")}
        </label>
        <input
          id="new_password"
          name="new_password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="confirm_password" className="mb-1.5 block text-sm font-medium">
          {t("settings.confirmPasswordLabel")}
        </label>
        <input
          id="confirm_password"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={inputClass}
        />
      </div>

      <SubmitButton pendingLabel={t("common.saving")} className={buttonClass}>
        {t("settings.passwordSave")}
      </SubmitButton>
    </ActionForm>
  );
}

export function EmailForm({ email }: { email: string }) {
  const { t } = useI18n();

  return (
    <ActionForm
      action={updateEmail}
      className="space-y-5 p-5"
      successMessage={t("settings.emailSent")}
    >
      <div>
        <label htmlFor="new_email" className="mb-1.5 block text-sm font-medium">
          {t("settings.newEmailLabel")}
        </label>
        <input
          id="new_email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={email}
          required
          className={inputClass}
        />
      </div>

      <SubmitButton pendingLabel={t("common.saving")} className={buttonClass}>
        {t("settings.emailSave")}
      </SubmitButton>
    </ActionForm>
  );
}
