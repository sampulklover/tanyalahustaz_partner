import { permissionsForRole, type KnowledgePermissions, type KnowledgeTeamRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export type DashboardContext = {
  userId: string;
  email: string;
  knowledge: KnowledgePermissions;
};

export async function getDashboardContext(): Promise<DashboardContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase.from("profiles").select("email").eq("id", user.id).single(),
    supabase.from("knowledge_team_members").select("role").eq("user_id", user.id).maybeSingle(),
  ]);

  const role = (membership?.role as KnowledgeTeamRole | undefined) ?? null;

  return {
    userId: user.id,
    email: user.email ?? profile?.email ?? "",
    knowledge: permissionsForRole(role),
  };
}

export async function requireKnowledgeTeamMember(): Promise<DashboardContext | null> {
  const context = await getDashboardContext();
  if (!context?.knowledge.canViewKnowledge) {
    return null;
  }
  return context;
}

export async function requireKnowledgeEditor(): Promise<DashboardContext | null> {
  const context = await getDashboardContext();
  if (!context?.knowledge.canEditKnowledge) {
    return null;
  }
  return context;
}

export async function requireKnowledgeAdmin(): Promise<DashboardContext | null> {
  const context = await getDashboardContext();
  if (!context?.knowledge.canManageTeam) {
    return null;
  }
  return context;
}

/** @deprecated Use requireKnowledgeTeamMember or requireKnowledgeEditor */
export async function requireAdminContext(): Promise<DashboardContext | null> {
  return requireKnowledgeEditor();
}
