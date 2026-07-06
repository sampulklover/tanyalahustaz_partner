"use server";

import { revalidatePath } from "next/cache";
import { requireKnowledgeAdmin } from "@/lib/dashboard";
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
  const admin = await requireKnowledgeAdmin();
  if (!admin) {
    return { error: "Only knowledge admins can assign roles." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = parseKnowledgeTeamRole(String(formData.get("role") ?? ""));

  if (!email) {
    return { error: "Email is required." };
  }
  if (!role) {
    return { error: "Choose a valid role." };
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
    return {
      error: "No account found with that email. They must sign up first, then you can assign a role.",
    };
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
  const admin = await requireKnowledgeAdmin();
  if (!admin) {
    return { error: "Only knowledge admins can change roles." };
  }

  if (!parseKnowledgeTeamRole(role)) {
    return { error: "Invalid role." };
  }

  const supabase = await createClient();

  if (userId === admin.userId && role !== "admin") {
    const adminCount = await countTeamAdmins();
    if (adminCount <= 1) {
      return { error: "You cannot demote yourself while you are the only admin." };
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
    return { error: "Team member not found." };
  }

  if (existing.role === "admin" && role !== "admin") {
    const adminCount = await countTeamAdmins();
    if (adminCount <= 1) {
      return { error: "At least one admin is required on the knowledge team." };
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
  return { success: "Role updated." };
}

export async function removeKnowledgeTeamMember(userId: string): Promise<ActionResult> {
  const admin = await requireKnowledgeAdmin();
  if (!admin) {
    return { error: "Only knowledge admins can remove team members." };
  }

  if (userId === admin.userId) {
    return { error: "You cannot remove yourself. Ask another admin to do it." };
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
    return { error: "Team member not found." };
  }

  if (existing.role === "admin") {
    const adminCount = await countTeamAdmins();
    if (adminCount <= 1) {
      return { error: "Cannot remove the only knowledge admin." };
    }
  }

  const { error } = await supabase.from("knowledge_team_members").delete().eq("user_id", userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/knowledge/team");
  return { success: "Team member removed." };
}
