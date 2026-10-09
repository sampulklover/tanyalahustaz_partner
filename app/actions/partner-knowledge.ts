"use server";

import { revalidatePath } from "next/cache";
import { getActionTranslations } from "@/lib/i18n/actions";
import {
  deletePartnerKnowledgeFile,
  ingestPartnerKnowledgeFile,
} from "@/lib/partner-knowledge";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error?: string; success?: string };

/** Per-file and per-partner caps, kept in sync with the upload UI. */
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_FILES_PER_PARTNER = 50;
/** Document types the extractor can read (lib/knowledge-extract.ts). */
const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt", ".md", ".markdown"] as const;

function isAllowedFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return ALLOWED_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

async function getUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function uploadPartnerKnowledgeFiles(
  formData: FormData,
): Promise<ActionResult> {
  const t = await getActionTranslations();
  const userId = await getUserId();
  if (!userId) return { error: t("actionErrors.notSignedIn") };

  const files = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length === 0) {
    return { error: t("partnerKnowledge.errors.noFiles") };
  }

  const { count } = await (
    await createClient()
  )
    .from("partner_knowledge_files")
    .select("id", { count: "exact", head: true })
    .eq("partner_id", userId);

  if ((count ?? 0) + files.length > MAX_FILES_PER_PARTNER) {
    return {
      error: t("partnerKnowledge.errors.tooMany", { max: MAX_FILES_PER_PARTNER }),
    };
  }

  let uploaded = 0;

  for (const file of files) {
    if (!isAllowedFile(file.name)) {
      return { error: t("partnerKnowledge.errors.unsupported", { name: file.name }) };
    }

    if (file.size > MAX_FILE_BYTES) {
      return {
        error: t("partnerKnowledge.errors.tooLarge", {
          name: file.name,
          max: Math.round(MAX_FILE_BYTES / 1024 / 1024),
        }),
      };
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    try {
      await ingestPartnerKnowledgeFile({
        partnerId: userId,
        filename: file.name,
        mimeType: file.type || null,
        buffer,
      });
      uploaded += 1;
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? `${file.name}: ${error.message}`
            : t("errors.unexpectedError"),
      };
    }
  }

  revalidatePath("/dashboard/knowledge-base");
  return { success: t("partnerKnowledge.uploaded", { count: uploaded }) };
}

export async function deletePartnerKnowledge(formData: FormData): Promise<ActionResult> {
  const t = await getActionTranslations();
  const userId = await getUserId();
  if (!userId) return { error: t("actionErrors.notSignedIn") };

  const fileId = String(formData.get("fileId") ?? "").trim();
  if (!fileId) return { error: t("errors.unexpectedError") };

  try {
    await deletePartnerKnowledgeFile(userId, fileId);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : t("errors.unexpectedError"),
    };
  }

  revalidatePath("/dashboard/knowledge-base");
  return { success: t("partnerKnowledge.deleted") };
}
