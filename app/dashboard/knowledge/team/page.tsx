import { KnowledgeNav } from "@/components/knowledge-nav";
import { KnowledgeTeamManager } from "@/components/knowledge-team-manager";
import { DashboardPage as DashboardShell } from "@/components/dashboard/page";
import { PageHeader } from "@/components/dashboard/page-header";
import { getDashboardContext } from "@/lib/dashboard";
import { createClient } from "@/lib/supabase/server";
import type { KnowledgeTeamMember, KnowledgeTeamMemberWithProfile } from "@/lib/types";
import { getTranslations } from "@/lib/i18n/server";

export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t("pages.knowledge.team.title") };
}

export default async function KnowledgeTeamPage() {
  const t = await getTranslations();
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
        email: profile?.email ?? t("common.unknown"),
        company_name: profile?.company_name ?? null,
      };
    },
  );

  return (
    <DashboardShell>
      <KnowledgeNav knowledge={context!.knowledge} active="team" />

      <PageHeader
        title={t("pages.knowledge.team.title")}
        description={t("pages.knowledge.team.description")}
      />

      <KnowledgeTeamManager members={team} currentUserId={context!.userId} />
    </DashboardShell>
  );
}
