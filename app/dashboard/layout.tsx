import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/site-header";
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
    <>
      <DashboardHeader email={context.email} knowledgeAccess={context.knowledge.canViewKnowledge} />
      {children}
    </>
  );
}
