import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/shell";
import { getDashboardContext } from "@/lib/dashboard";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getDashboardContext();
  if (!context) {
    redirect("/login");
  }

  return (
    <DashboardShell
      email={context.email}
      knowledgeAccess={context.knowledge.canViewKnowledge}
    >
      {children}
    </DashboardShell>
  );
}
