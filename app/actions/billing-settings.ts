"use server";

import { revalidatePath } from "next/cache";
import { MIN_MARKUP_PERCENT } from "@/lib/billing";
import { saveMarkupPercent } from "@/lib/billing-settings";
import { requireKnowledgeAdmin } from "@/lib/dashboard";
import { getActionTranslations } from "@/lib/i18n/actions";

type ActionResult = { error?: string; success?: string };

export async function updateBillingMarkup(formData: FormData): Promise<ActionResult> {
  const t = await getActionTranslations();
  const admin = await requireKnowledgeAdmin();
  if (!admin) {
    return { error: t("actionErrors.adminAccessRequired") };
  }

  const value = Number(formData.get("markupPercent"));

  if (!Number.isFinite(value) || value < MIN_MARKUP_PERCENT) {
    return { error: t("knowledge.pricing.invalidMarkup", { min: MIN_MARKUP_PERCENT }) };
  }

  try {
    await saveMarkupPercent(value, admin.userId);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : t("errors.unexpectedError"),
    };
  }

  revalidatePath("/dashboard/knowledge/pricing");
  return { success: t("knowledge.pricing.saved") };
}
