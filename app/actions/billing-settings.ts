"use server";

import { revalidatePath } from "next/cache";
import { MIN_MARKUP_PERCENT } from "@/lib/billing";
import { saveMarkupPercent } from "@/lib/billing-settings";
import { requireKnowledgeAdmin } from "@/lib/dashboard";

export async function updateBillingMarkup(formData: FormData): Promise<void> {
  const admin = await requireKnowledgeAdmin();
  if (!admin) {
    throw new Error("Admin access required.");
  }

  const value = Number(formData.get("markupPercent"));

  if (!Number.isFinite(value) || value < MIN_MARKUP_PERCENT) {
    throw new Error(`Markup must be at least ${MIN_MARKUP_PERCENT}%.`);
  }

  await saveMarkupPercent(value, admin.userId);
  revalidatePath("/dashboard/knowledge/pricing");
}
