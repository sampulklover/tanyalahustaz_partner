"use server";

import { revalidatePath } from "next/cache";
import { savePartnerPrompt } from "@/lib/ai-settings";
import { createClient } from "@/lib/supabase/server";

async function getUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function updatePartnerPrompt(formData: FormData): Promise<void> {
  const userId = await getUserId();
  if (!userId) throw new Error("Not signed in.");

  const prompt = String(formData.get("promptInstructions") ?? "");
  await savePartnerPrompt(userId, prompt);
  revalidatePath("/dashboard/prompt");
}

export async function resetPartnerPrompt(): Promise<void> {
  const userId = await getUserId();
  if (!userId) throw new Error("Not signed in.");

  await savePartnerPrompt(userId, "");
  revalidatePath("/dashboard/prompt");
}
