"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, signUp } from "@/app/actions/auth";
import { GET_STARTED_LABEL, SIGN_IN_LABEL } from "@/lib/brand";

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
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          required
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
          Password
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
        {isPending ? "Signing in…" : SIGN_IN_LABEL}
      </button>
      <p className="text-center text-sm text-[color:var(--muted)]">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-brand-600 hover:underline dark:text-brand-500">
          {GET_STARTED_LABEL}
        </Link>
      </p>
    </form>
  );
}

export function SignupForm({ inviteRequired = false }: { inviteRequired?: boolean }) {
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
            Invite code
          </label>
          <input
            id="invite_code"
            name="invite_code"
            type="text"
            autoComplete="off"
            placeholder="Enter your partner invite code"
            required
            className={inputClass}
          />
          <p className="mt-1.5 text-xs text-[color:var(--muted)]">
            Partner signup is invite-only. Contact us if you need access.
          </p>
        </div>
      )}
      <div>
        <label htmlFor="company_name" className="mb-1.5 block text-sm font-medium">
          Company name <span className="font-normal text-[color:var(--muted)]">(optional)</span>
        </label>
        <input
          id="company_name"
          name="company_name"
          type="text"
          autoComplete="organization"
          placeholder="Acme Inc."
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
          Work email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          required
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
          Password
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
        <p className="mt-1.5 text-xs text-[color:var(--muted)]">At least 8 characters.</p>
      </div>
      <ErrorNote error={state.error} />
      <button type="submit" disabled={isPending} className={buttonClass}>
        {isPending ? "Creating account…" : "Create account"}
      </button>
      <p className="text-center text-sm text-[color:var(--muted)]">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-600 hover:underline dark:text-brand-500">
          {SIGN_IN_LABEL}
        </Link>
      </p>
    </form>
  );
}
