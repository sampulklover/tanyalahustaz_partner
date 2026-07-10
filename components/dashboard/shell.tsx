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
    <div className="flex min-h-dvh w-full flex-col lg:flex-row">
      <DashboardSidebar email={email} knowledgeAccess={knowledgeAccess} />
      <main className="flex min-h-0 min-w-0 w-full flex-1 flex-col lg:min-h-dvh lg:pl-60">
        {children}
      </main>
    </div>
  );
}
