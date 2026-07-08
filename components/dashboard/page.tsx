import type { ReactNode } from "react";

export function DashboardPage({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full flex-1 flex-col bg-background-subtle">
      <div className="w-full px-6 py-8 sm:px-8 sm:py-10">{children}</div>
    </div>
  );
}
