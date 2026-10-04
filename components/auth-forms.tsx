"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { signIn, signInWithGoogle, signUp } from "@/app/actions/auth";
import { Spinner } from "@/components/spinner";
import { useI18n } from "@/lib/i18n/client";

type AuthState = { error?: string };

const inputClass =
  "w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30";

const buttonClass =
  "inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60";

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

/**
 * Google sign-in redirects away, so it has no form of its own — the button
 * lives inside the login/signup form and must not nest another <form>.
 */
function useGoogleSignIn() {
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  function signIn() {
    setError(undefined);
    startTransition(async () => {
      const result = await signInWithGoogle();
      if (result?.error) setError(result.error);
    });
  }

  return { error, isPending, signIn };
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.62v3h3.86c2.26-2.09 3.56-5.17 3.56-8.86z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.86-3c-1.08.72-2.45 1.16-4.08 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29a7.19 7.19 0 0 1 0-4.58V6.62H1.29a11.97 11.97 0 0 0 0 10.76l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A11.99 11.99 0 0 0 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}

function GoogleSignInButton() {
  const { t } = useI18n();
  const { error, isPending, signIn } = useGoogleSignIn();

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => void signIn()}
        disabled={isPending}
        className="inline-flex w-full items-center justify-center gap-2.5 rounded-lg border border-border bg-card py-2.5 text-sm font-semibold transition hover:bg-background-subtle disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? <Spinner className="h-4 w-4" /> : <GoogleIcon />}
        {t("auth.continueWithGoogle")}
      </button>
      <ErrorNote error={error} />
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wide text-[color:var(--muted)]">
          {t("auth.orDivider")}
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
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
      <GoogleSignInButton />
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
        {isPending && <Spinner className="h-4 w-4" />}
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
      <GoogleSignInButton />
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
        {isPending && <Spinner className="h-4 w-4" />}
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
