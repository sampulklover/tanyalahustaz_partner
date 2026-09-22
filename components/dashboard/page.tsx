import type { ReactNode } from "react";

export function DashboardPage({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full flex-1 flex-col bg-background-subtle">
      <div className="mx-auto w-full max-w-6xl px-6 py-8 sm:px-8 sm:py-10">{children}</div>
    </div>
  );
}
