import Link from "next/link";
import { KnowledgeArticleForm } from "@/components/knowledge-article-form";
import { KnowledgeNav } from "@/components/knowledge-nav";
import { getDashboardContext } from "@/lib/dashboard";

export const metadata = { title: "New Knowledge Article" };

export default async function NewKnowledgeArticlePage() {
  const context = await getDashboardContext();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <KnowledgeNav knowledge={context!.knowledge} active="articles" />

      <Link
        href="/dashboard/knowledge"
        className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        ← Back to articles
      </Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">New article</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Add content for the AI to reference when answering partner chat requests.
      </p>
      <div className="mt-8">
        <KnowledgeArticleForm />
      </div>
    </main>
  );
}
