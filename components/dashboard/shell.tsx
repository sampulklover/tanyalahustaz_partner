import type { ReactNode } from "react";
import { DashboardSidebar } from "@/components/dashboard/sidebar";

export function DashboardShell({
  email,
  knowledgeAccess,
  children,
}: {
  email: string;
  knowledgeAccess: boolean;
  children: ReactNode;
}) {
  return (
      <div className="flex min-h-screen w-full flex-col lg:flex-row">
      <DashboardSidebar email={email} knowledgeAccess={knowledgeAccess} />
      <main className="flex min-h-screen min-w-0 w-full flex-1 flex-col lg:pl-60">
        {children}
      </main>
    </div>
  );
}
