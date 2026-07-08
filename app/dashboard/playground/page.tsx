import { ChatPlayground } from "@/components/chat-playground";
import { DashboardPage as DashboardShell } from "@/components/dashboard/page";
import { PageHeader } from "@/components/dashboard/page-header";

export const metadata = { title: "Playground" };

export default function PlaygroundPage() {
  return (
    <DashboardShell>
      <PageHeader
        title="Playground"
        description="Test POST /api/v1/chat with the same knowledge base and pipeline as production."
      />
      <ChatPlayground />
    </DashboardShell>
  );
}
