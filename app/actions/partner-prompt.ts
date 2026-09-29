"use server";

import { revalidatePath } from "next/cache";
import { savePartnerPrompt } from "@/lib/ai-settings";
import { getActionTranslations } from "@/lib/i18n/actions";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error?: string; success?: string };

async function getUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function updatePartnerPrompt(formData: FormData): Promise<ActionResult> {
  const t = await getActionTranslations();
  const userId = await getUserId();
  if (!userId) return { error: t("actionErrors.notSignedIn") };

  const prompt = String(formData.get("promptInstructions") ?? "");

  try {
    await savePartnerPrompt(userId, prompt);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : t("errors.unexpectedError"),
    };
  }

  revalidatePath("/dashboard/prompt");
  return { success: t("partnerPrompt.saved") };
}

export async function resetPartnerPrompt(): Promise<ActionResult> {
  const t = await getActionTranslations();
  const userId = await getUserId();
  if (!userId) return { error: t("actionErrors.notSignedIn") };

  try {
    await savePartnerPrompt(userId, "");
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : t("errors.unexpectedError"),
    };
  }

  revalidatePath("/dashboard/prompt");
  return { success: t("partnerPrompt.resetDone") };
}
