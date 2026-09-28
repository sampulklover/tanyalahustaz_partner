"use server";

import { revalidatePath } from "next/cache";
import { saveSystemPrompt } from "@/lib/ai-settings";
import { requireKnowledgeEditor } from "@/lib/dashboard";

export async function updateSystemPrompt(formData: FormData): Promise<void> {
  const admin = await requireKnowledgeEditor();
  if (!admin) {
    throw new Error("Editor access required.");
  }

  const prompt = String(formData.get("systemPrompt") ?? "");
  await saveSystemPrompt(prompt, admin.userId);
  revalidatePath("/dashboard/knowledge/prompt");
}

export async function resetSystemPrompt(): Promise<void> {
  const admin = await requireKnowledgeEditor();
  if (!admin) {
    throw new Error("Editor access required.");
  }

  await saveSystemPrompt("", admin.userId);
  revalidatePath("/dashboard/knowledge/prompt");
}
