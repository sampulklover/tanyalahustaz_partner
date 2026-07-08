import { KnowledgeNav } from "@/components/knowledge-nav";
import { KnowledgeTeamManager } from "@/components/knowledge-team-manager";
import { DashboardPage as DashboardShell } from "@/components/dashboard/page";
import { PageHeader } from "@/components/dashboard/page-header";
import { getDashboardContext } from "@/lib/dashboard";
import { createClient } from "@/lib/supabase/server";
import type { KnowledgeTeamMember, KnowledgeTeamMemberWithProfile } from "@/lib/types";

export const metadata = { title: "Knowledge Team" };

export default async function KnowledgeTeamPage() {
  const context = await getDashboardContext();
  const supabase = await createClient();

  const { data: members, error } = await supabase
    .from("knowledge_team_members")
    .select("user_id, role, granted_by, created_at, updated_at")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const userIds = (members ?? []).map((member) => member.user_id);
  const { data: profiles } = userIds.length
    ? await supabase
        .from("profiles")
        .select("id, email, company_name")
        .in("id", userIds)
    : { data: [] };

  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  const team: KnowledgeTeamMemberWithProfile[] = ((members ?? []) as KnowledgeTeamMember[]).map(
    (member) => {
      const profile = profileById.get(member.user_id);
      return {
        ...member,
        email: profile?.email ?? "Unknown",
        company_name: profile?.company_name ?? null,
      };
    },
  );

  return (
    <DashboardShell>
      <KnowledgeNav knowledge={context!.knowledge} active="team" />

      <PageHeader
        title="Knowledge team"
        description="Assign roles so colleagues can help manage articles. Everyone needs a partner account before you can add them."
      />

      <KnowledgeTeamManager members={team} currentUserId={context!.userId} />
    </DashboardShell>
  );
}
