import { redirect } from "next/navigation";
import { requireKnowledgeAdmin } from "@/lib/dashboard";

export default async function KnowledgeTeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireKnowledgeAdmin();
  if (!admin) {
    redirect("/dashboard/knowledge");
  }

  return children;
}
