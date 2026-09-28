"use server";

import { revalidatePath } from "next/cache";
import { requireKnowledgeEditor } from "@/lib/dashboard";
import { createAdminClient } from "@/lib/supabase/admin";

const PROVIDER = "gcs";

function isValidPath(path: string): boolean {
  return (
    path.length > 0 &&
    path.length <= 1024 &&
    !path.startsWith("/") &&
    !path.includes("..") &&
    !path.includes("\u0000")
  );
}

/** Add or remove one selected source path, submitted from the picker forms. */
export async function toggleSourceSelection(formData: FormData): Promise<void> {
  const admin = await requireKnowledgeEditor();
  if (!admin) {
    throw new Error("Editor access required.");
  }

  const path = String(formData.get("path") ?? "");
  const kind = String(formData.get("kind") ?? "");
  const selected = formData.get("selected") === "true";

  if (!isValidPath(path)) {
    throw new Error("Invalid path.");
  }

  const client = createAdminClient();

  if (selected) {
    if (kind !== "file" && kind !== "folder") {
      throw new Error("Invalid selection type.");
    }

    const { error } = await client
      .from("knowledge_source_selections")
      .upsert(
        { provider: PROVIDER, path, kind, created_by: admin.userId },
        { onConflict: "provider,path" },
      );

    if (error) {
      throw new Error(error.message);
    }
  } else {
    const { error } = await client
      .from("knowledge_source_selections")
      .delete()
      .eq("provider", PROVIDER)
      .eq("path", path);

    if (error) {
      throw new Error(error.message);
    }
  }

  revalidatePath("/dashboard/knowledge/sources");
}

export async function clearSourceSelections(): Promise<void> {
  const admin = await requireKnowledgeEditor();
  if (!admin) {
    throw new Error("Editor access required.");
  }

  const client = createAdminClient();
  const { error } = await client
    .from("knowledge_source_selections")
    .delete()
    .eq("provider", PROVIDER);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/knowledge/sources");
}
