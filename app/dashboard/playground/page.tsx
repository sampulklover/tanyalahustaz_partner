import { redirect } from "next/navigation";
import { ChatPlayground } from "@/components/chat-playground";
import { KnowledgeNav } from "@/components/knowledge-nav";
import { getDashboardContext } from "@/lib/dashboard";
import { getTranslations } from "@/lib/i18n/server";

export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t("pages.playground.title") };
}

export default async function PlaygroundPage() {
  const context = await getDashboardContext();
  if (!context?.isTeamMember) {
    redirect("/dashboard");
  }

  const t = await getTranslations();

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden bg-background-subtle lg:h-dvh">
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-6 py-8 sm:px-8 sm:py-10">
        <KnowledgeNav knowledge={context.knowledge} active="playground" />
        <header className="mb-4 shrink-0">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            {t("pages.playground.title")}
          </h1>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            {t("pages.playground.description")}
          </p>
        </header>
        <div className="min-h-0 flex-1">
          <ChatPlayground />
        </div>
      </div>
    </div>
  );
}
