"use server";

import { redirect } from "next/navigation";
import { logError } from "@/lib/logger";
import { getActionTranslations } from "@/lib/i18n/actions";
import {
  consumeSignupInvite,
  isInviteRequired,
  validateSignupInvite,
} from "@/lib/signup-invite";
import { createClient } from "@/lib/supabase/server";

function isEmailConfirmed(user: { email_confirmed_at?: string | null }) {
  return Boolean(user.email_confirmed_at);
}

export async function signUp(formData: FormData): Promise<{ error: string } | void> {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const companyName = String(formData.get("company_name") ?? "").trim();
  const inviteCode = String(formData.get("invite_code") ?? "").trim();

  let inviteValidation: Awaited<ReturnType<typeof validateSignupInvite>> | null = null;

  if (isInviteRequired()) {
    inviteValidation = await validateSignupInvite(inviteCode, email);
    if (!inviteValidation.ok) {
      return { error: inviteValidation.error };
    }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (
    inviteValidation?.ok &&
    inviteValidation.source === "database"
  ) {
    try {
      await consumeSignupInvite(inviteCode, inviteValidation);
    } catch (consumeError) {
      logError("Failed to consume signup invite", consumeError, { email });
    }
  }

  if (data.user && companyName) {
    await supabase
      .from("profiles")
      .update({ company_name: companyName })
      .eq("id", data.user.id);
  }

  if (data.user && !isEmailConfirmed(data.user)) {
    redirect(`/verify-email?email=${encodeURIComponent(email)}`);
  }

  redirect("/dashboard");
}

export async function signIn(formData: FormData): Promise<{ error: string } | void> {
  const t = await getActionTranslations();
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  if (data.user && !isEmailConfirmed(data.user)) {
    await supabase.auth.signOut();
    return {
      error: t("actionErrors.verifyEmailBeforeSignIn"),
    };
  }

  const redirectTo = String(formData.get("redirect") ?? "/dashboard");
  redirect(redirectTo);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
