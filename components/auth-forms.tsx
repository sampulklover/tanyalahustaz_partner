"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, signUp } from "@/app/actions/auth";
import { useI18n } from "@/lib/i18n/client";

type AuthState = { error?: string };

const inputClass =
  "w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30";

const buttonClass =
  "w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60";

function ErrorNote({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      {error}
    </p>
  );
}

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const { t } = useI18n();
  const [state, formAction, isPending] = useActionState<AuthState, FormData>(
    async (_prev, formData) => {
      const result = await signIn(formData);
      return result ?? {};
    },
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="redirect" value={redirectTo} />
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
          {t("auth.email")}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder={t("auth.emailPlaceholder")}
          required
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
          {t("auth.password")}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          className={inputClass}
        />
      </div>
      <ErrorNote error={state.error} />
      <button type="submit" disabled={isPending} className={buttonClass}>
        {isPending ? t("auth.signingIn") : t("brand.signIn")}
      </button>
      <p className="text-center text-sm text-[color:var(--muted)]">
        {t("auth.noAccount")}{" "}
        <Link href="/signup" className="font-medium text-brand-600 hover:underline dark:text-brand-500">
          {t("brand.getStarted")}
        </Link>
      </p>
    </form>
  );
}

export function SignupForm({ inviteRequired = false }: { inviteRequired?: boolean }) {
  const { t } = useI18n();
  const [state, formAction, isPending] = useActionState<AuthState, FormData>(
    async (_prev, formData) => {
      const result = await signUp(formData);
      return result ?? {};
    },
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      {inviteRequired && (
        <div>
          <label htmlFor="invite_code" className="mb-1.5 block text-sm font-medium">
            {t("auth.inviteCode")}
          </label>
          <input
            id="invite_code"
            name="invite_code"
            type="text"
            autoComplete="off"
            placeholder={t("auth.invitePlaceholder")}
            required
            className={inputClass}
          />
          <p className="mt-1.5 text-xs text-[color:var(--muted)]">
            {t("auth.inviteHelp")}
          </p>
        </div>
      )}
      <div>
        <label htmlFor="company_name" className="mb-1.5 block text-sm font-medium">
          {t("auth.companyName")}{" "}
          <span className="font-normal text-[color:var(--muted)]">{t("auth.optional")}</span>
        </label>
        <input
          id="company_name"
          name="company_name"
          type="text"
          autoComplete="organization"
          placeholder={t("auth.companyPlaceholder")}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
          {t("auth.workEmail")}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder={t("auth.emailPlaceholder")}
          required
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
          {t("auth.password")}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={inputClass}
        />
        <p className="mt-1.5 text-xs text-[color:var(--muted)]">{t("auth.passwordHint")}</p>
      </div>
      <ErrorNote error={state.error} />
      <button type="submit" disabled={isPending} className={buttonClass}>
        {isPending ? t("auth.creatingAccount") : t("auth.createAccount")}
      </button>
      <p className="text-center text-sm text-[color:var(--muted)]">
        {t("auth.hasAccount")}{" "}
        <Link href="/login" className="font-medium text-brand-600 hover:underline dark:text-brand-500">
          {t("brand.signIn")}
        </Link>
      </p>
    </form>
  );
}
