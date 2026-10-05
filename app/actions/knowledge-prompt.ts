"use server";

import { revalidatePath } from "next/cache";
import { saveModulePrompt, saveSystemPrompt } from "@/lib/ai-settings";
import { requireKnowledgeEditor } from "@/lib/dashboard";
import { PROMPT_MODULE_IDS, type PromptModuleId } from "@/lib/prompts/modules";
import { getActionTranslations } from "@/lib/i18n/actions";

type ActionResult = { error?: string; success?: string };

export async function updateSystemPrompt(formData: FormData): Promise<ActionResult> {
  const t = await getActionTranslations();
  const admin = await requireKnowledgeEditor();
  if (!admin) {
    return { error: t("actionErrors.editorAccessRequired") };
  }

  const prompt = String(formData.get("systemPrompt") ?? "");

  try {
    await saveSystemPrompt(prompt, admin.userId);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : t("errors.unexpectedError"),
    };
  }

  revalidatePath("/dashboard/knowledge/prompt");
  return { success: t("knowledge.prompt.saved") };
}

export async function resetSystemPrompt(): Promise<ActionResult> {
  const t = await getActionTranslations();
  const admin = await requireKnowledgeEditor();
  if (!admin) {
    return { error: t("actionErrors.editorAccessRequired") };
  }

  try {
    await saveSystemPrompt("", admin.userId);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : t("errors.unexpectedError"),
    };
  }

  revalidatePath("/dashboard/knowledge/prompt");
  return { success: t("knowledge.prompt.resetDone") };
}

export async function updateModulePrompt(formData: FormData): Promise<ActionResult> {
  const t = await getActionTranslations();
  const admin = await requireKnowledgeEditor();
  if (!admin) {
    return { error: t("actionErrors.editorAccessRequired") };
  }

  const moduleId = String(formData.get("moduleId") ?? "") as PromptModuleId;

  if (!PROMPT_MODULE_IDS.includes(moduleId)) {
    return { error: t("errors.unexpectedError") };
  }

  const prompt = String(formData.get("modulePrompt") ?? "");

  try {
    await saveModulePrompt(moduleId, prompt, admin.userId);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : t("errors.unexpectedError"),
    };
  }

  revalidatePath("/dashboard/knowledge/prompt");
  return { success: t("knowledge.prompt.moduleSaved") };
}
