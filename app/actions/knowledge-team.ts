"use server";

import { revalidatePath } from "next/cache";
import { requireKnowledgeAdmin } from "@/lib/dashboard";
import { getActionTranslations } from "@/lib/i18n/actions";
import { parseKnowledgeTeamRole, type KnowledgeTeamRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error?: string; success?: string };

async function countTeamAdmins() {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("knowledge_team_members")
    .select("*", { count: "exact", head: true })
    .eq("role", "admin");

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function assignKnowledgeTeamMember(formData: FormData): Promise<ActionResult> {
  const t = await getActionTranslations();
  const admin = await requireKnowledgeAdmin();
  if (!admin) {
    return { error: t("actionErrors.adminAssignOnly") };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = parseKnowledgeTeamRole(String(formData.get("role") ?? ""));

  if (!email) {
    return { error: t("actionErrors.emailRequired") };
  }
  if (!role) {
    return { error: t("actionErrors.invalidRole") };
  }

  const supabase = await createClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email")
    .ilike("email", email)
    .maybeSingle();

  if (profileError) {
    return { error: profileError.message };
  }
  if (!profile) {
    return { error: t("actionErrors.accountNotFound") };
  }

  const { error } = await supabase.from("knowledge_team_members").upsert(
    {
      user_id: profile.id,
      role,
      granted_by: admin.userId,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/knowledge/team");
  return { success: `Assigned ${role} role to ${profile.email}.` };
}

export async function updateKnowledgeTeamMemberRole(
  userId: string,
  role: KnowledgeTeamRole,
): Promise<ActionResult> {
  const t = await getActionTranslations();
  const admin = await requireKnowledgeAdmin();
  if (!admin) {
    return { error: t("actionErrors.adminChangeOnly") };
  }

  if (!parseKnowledgeTeamRole(role)) {
    return { error: t("actionErrors.invalidRole") };
  }

  const supabase = await createClient();

  if (userId === admin.userId && role !== "admin") {
    const adminCount = await countTeamAdmins();
    if (adminCount <= 1) {
      return { error: t("actionErrors.cannotDemoteSelf") };
    }
  }

  const { data: existing, error: existingError } = await supabase
    .from("knowledge_team_members")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) {
    return { error: existingError.message };
  }
  if (!existing) {
    return { error: t("actionErrors.memberNotFound") };
  }

  if (existing.role === "admin" && role !== "admin") {
    const adminCount = await countTeamAdmins();
    if (adminCount <= 1) {
      return { error: t("actionErrors.adminRequired") };
    }
  }

  const { error } = await supabase
    .from("knowledge_team_members")
    .update({ role, granted_by: admin.userId })
    .eq("user_id", userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/knowledge/team");
  return { success: t("actionErrors.roleUpdated") };
}

export async function removeKnowledgeTeamMember(userId: string): Promise<ActionResult> {
  const t = await getActionTranslations();
  const admin = await requireKnowledgeAdmin();
  if (!admin) {
    return { error: t("actionErrors.adminRemoveOnly") };
  }

  if (userId === admin.userId) {
    return { error: t("actionErrors.cannotRemoveSelf") };
  }

  const supabase = await createClient();
  const { data: existing, error: existingError } = await supabase
    .from("knowledge_team_members")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) {
    return { error: existingError.message };
  }
  if (!existing) {
    return { error: t("actionErrors.memberNotFound") };
  }

  if (existing.role === "admin") {
    const adminCount = await countTeamAdmins();
    if (adminCount <= 1) {
      return { error: t("actionErrors.cannotRemoveOnlyAdmin") };
    }
  }

  const { error } = await supabase.from("knowledge_team_members").delete().eq("user_id", userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/knowledge/team");
  return { success: t("actionErrors.memberRemoved") };
}
