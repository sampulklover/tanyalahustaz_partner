"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getActionTranslations } from "@/lib/i18n/actions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error?: string; success?: string };

export async function updateProfile(formData: FormData): Promise<ActionResult> {
  const t = await getActionTranslations();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: t("actionErrors.notSignedIn") };

  const fullName = String(formData.get("full_name") ?? "").trim();
  const companyName = String(formData.get("company_name") ?? "").trim();

  const { error: authError } = await supabase.auth.updateUser({
    data: { full_name: fullName },
  });

  if (authError) return { error: authError.message };

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ company_name: companyName || null })
    .eq("id", user.id);

  if (profileError) return { error: profileError.message };

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  return { success: t("settings.saved") };
}

export async function updatePassword(formData: FormData): Promise<ActionResult> {
  const t = await getActionTranslations();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: t("actionErrors.notSignedIn") };

  const currentPassword = String(formData.get("current_password") ?? "");
  const newPassword = String(formData.get("new_password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (newPassword.length < 8) return { error: t("settings.passwordTooShort") };
  if (newPassword !== confirmPassword) return { error: t("settings.passwordMismatch") };

  // Users who signed up with email already have a password to confirm.
  const hasEmailPassword = (user.identities ?? []).some(
    (identity) => identity.provider === "email",
  );

  if (hasEmailPassword) {
    if (!currentPassword) return { error: t("settings.currentPasswordWrong") };

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email ?? "",
      password: currentPassword,
    });

    if (verifyError) return { error: t("settings.currentPasswordWrong") };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: error.message };

  return { success: t("settings.passwordSaved") };
}

export async function updateEmail(formData: FormData): Promise<ActionResult> {
  const t = await getActionTranslations();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: t("actionErrors.notSignedIn") };

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: t("settings.emailInvalid") };
  }

  if (email === (user.email ?? "").toLowerCase()) {
    return { error: t("settings.emailSame") };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.updateUser(
    { email },
    { emailRedirectTo: `${appUrl}/auth/callback` },
  );

  if (error) return { error: error.message };

  return { success: t("settings.emailSent") };
}

export async function deleteAccount(): Promise<ActionResult> {
  const t = await getActionTranslations();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: t("actionErrors.notSignedIn") };

  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) return { error: error.message };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : t("settings.deleteError"),
    };
  }

  await supabase.auth.signOut();
  redirect("/");
}
