import { redirect } from "next/navigation";
import { requireKnowledgeTeamMember } from "@/lib/dashboard";

export default async function KnowledgeAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const member = await requireKnowledgeTeamMember();
  if (!member) {
    redirect("/dashboard");
  }

  return children;
}
