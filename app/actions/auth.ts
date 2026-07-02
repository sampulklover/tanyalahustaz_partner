"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { generateApiKey } from "@/lib/api-keys";
import { createClient } from "@/lib/supabase/server";

export async function signUp(formData: FormData): Promise<{ error: string } | void> {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const companyName = String(formData.get("company_name") ?? "").trim();

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

  if (data.user && companyName) {
    await supabase
      .from("profiles")
      .update({ company_name: companyName })
      .eq("id", data.user.id);
  }

  redirect("/dashboard");
}

export async function signIn(formData: FormData): Promise<{ error: string } | void> {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  const redirectTo = String(formData.get("redirect") ?? "/dashboard");
  redirect(redirectTo);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
