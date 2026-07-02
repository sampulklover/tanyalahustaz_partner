"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, signUp } from "@/app/actions/auth";

type AuthState = { error?: string };

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
          required
          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none ring-emerald-600 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
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
          required
          minLength={8}
          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none ring-emerald-600 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
      >
        {isPending ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-center text-sm text-zinc-500">
        No account?{" "}
        <Link href="/signup" className="text-emerald-600 hover:underline">
          Create one
        </Link>
      </p>
    </form>
  );
}

export function SignupForm() {
  const [state, formAction, isPending] = useActionState<AuthState, FormData>(
    async (_prev, formData) => {
      const result = await signUp(formData);
      return result ?? {};
    },
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="company_name" className="mb-1.5 block text-sm font-medium">
          Company name
        </label>
        <input
          id="company_name"
          name="company_name"
          type="text"
          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none ring-emerald-600 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none ring-emerald-600 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
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
          required
          minLength={8}
          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none ring-emerald-600 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
      >
        {isPending ? "Creating account…" : "Create account"}
      </button>
      <p className="text-center text-sm text-zinc-500">
        Already have an account?{" "}
        <Link href="/login" className="text-emerald-600 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
