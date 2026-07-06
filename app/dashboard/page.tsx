import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { ApiUsageEntry, KnowledgeArticle, PartnerChatLog } from "@/lib/types";
import { getDashboardContext } from "@/lib/dashboard";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const context = await getDashboardContext();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const [
    { data: profile },
    { count: activeKeys },
    { count: chatCount },
    { count: knowledgeCount },
    { data: recentUsage },
    { data: recentChats },
    { data: knowledgePreview },
  ] = await Promise.all([
    supabase.from("profiles").select("company_name, created_at").eq("id", user!.id).single(),
    supabase
      .from("api_keys")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user!.id)
      .is("revoked_at", null),
    supabase
      .from("partner_chat_logs")
      .select("*", { count: "exact", head: true })
      .eq("partner_id", user!.id),
    supabase
      .from("knowledge_articles")
      .select("*", { count: "exact", head: true })
      .eq("published", true),
    supabase
      .from("api_usage")
      .select("id, endpoint, method, status_code, created_at, api_key_id")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("partner_chat_logs")
      .select("id, session_id, user_message, assistant_message, model, created_at")
      .eq("partner_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("knowledge_articles")
      .select("slug, title, category")
      .eq("published", true)
      .order("title", { ascending: true })
      .limit(5),
  ]);

  const usage = (recentUsage ?? []) as ApiUsageEntry[];
  const chats = (recentChats ?? []) as Pick<
    PartnerChatLog,
    "id" | "session_id" | "user_message" | "assistant_message" | "model" | "created_at"
  >[];
  const knowledge = (knowledgePreview ?? []) as Pick<KnowledgeArticle, "slug" | "title" | "category">[];

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Welcome back{profile?.company_name ? `, ${profile.company_name}` : ""}. Integrate Islamic
          AI into your website using our knowledge-backed chat API.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm text-zinc-500">Active API keys</p>
            <p className="mt-2 text-3xl font-bold">{activeKeys ?? 0}</p>
            <Link
              href="/dashboard/api-keys"
              className="mt-4 inline-block text-sm font-medium text-emerald-600 hover:underline"
            >
              Manage keys →
            </Link>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm text-zinc-500">Chat requests</p>
            <p className="mt-2 text-3xl font-bold">{chatCount ?? 0}</p>
            <Link
              href="/dashboard/chat"
              className="mt-4 inline-block text-sm font-medium text-emerald-600 hover:underline"
            >
              View chat logs →
            </Link>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm text-zinc-500">Knowledge articles</p>
            <p className="mt-2 text-3xl font-bold">{knowledgeCount ?? 0}</p>
            {context?.knowledge.canViewKnowledge ? (
              <Link
                href="/dashboard/knowledge"
                className="mt-4 inline-block text-sm font-medium text-emerald-600 hover:underline"
              >
                Manage knowledge →
              </Link>
            ) : (
              <Link
                href="/docs/endpoints"
                className="mt-4 inline-block text-sm font-medium text-emerald-600 hover:underline"
              >
                Browse via API →
              </Link>
            )}
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm text-zinc-500">API base URL</p>
            <code className="mt-2 block text-sm break-all">{baseUrl}/api/v1</code>
            <Link
              href="/docs"
              className="mt-4 inline-block text-sm font-medium text-emerald-600 hover:underline"
            >
              Documentation →
            </Link>
          </div>
        </div>

        <section className="mt-10 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900 dark:bg-emerald-950/30">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">
                Test the AI in the playground
              </h2>
              <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-300">
                No curl needed — chat directly with the same pipeline as <code>POST /api/v1/chat</code>.
              </p>
            </div>
            <Link
              href="/dashboard/playground"
              className="inline-flex shrink-0 items-center justify-center rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              Open playground
            </Link>
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold">Try the AI chat API</h2>
          <p className="mt-1 text-sm text-zinc-500">
            We enrich prompts with TanyaLah Ustaz knowledge, then generate answers via OpenRouter.
          </p>
          <div className="mt-4 space-y-4">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Ask the AI (main integration endpoint)
              </p>
              <pre className="overflow-x-auto rounded-xl bg-zinc-50 p-4 text-xs dark:bg-zinc-950">
{`curl -X POST ${baseUrl}/api/v1/chat \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"message":"Can a traveler combine Dhuhr and Asr?","category":"fiqh","session_id":"user-123"}'`}
              </pre>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Browse knowledge articles
              </p>
              <pre className="overflow-x-auto rounded-xl bg-zinc-50 p-4 text-xs dark:bg-zinc-950">
{`curl "${baseUrl}/api/v1/knowledge?category=fiqh" \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
              </pre>
            </div>
          </div>
        </section>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold">Recent chat requests</h2>
            {chats.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">
                No chat requests yet. POST to <code>/api/v1/chat</code> to test the AI.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {chats.map((chat) => (
                  <li key={chat.id} className="rounded-lg border border-zinc-100 p-3 dark:border-zinc-800">
                    <p className="text-sm font-medium line-clamp-2">{chat.user_message}</p>
                    <p className="mt-2 text-sm text-zinc-600 line-clamp-2 dark:text-zinc-400">
                      {chat.assistant_message}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-500">
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">
                        {chat.model}
                      </span>
                      <span>{new Date(chat.created_at).toLocaleString()}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-6">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-lg font-semibold">Knowledge base preview</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Curated content used as AI context. Managed by TanyaLah Ustaz.
              </p>
              {knowledge.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-500">No published articles yet.</p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {knowledge.map((article) => (
                    <li key={article.slug} className="flex items-center justify-between text-sm">
                      <span>{article.title}</span>
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
                        {article.category}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-lg font-semibold">Recent API activity</h2>
              {usage.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-500">No API calls logged yet.</p>
              ) : (
                <ul className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
                  {usage.map((entry) => (
                    <li key={entry.id} className="flex items-center justify-between py-3 text-sm">
                      <div>
                        <span className="mr-2 rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-xs text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {entry.method}
                        </span>
                        <code className="text-xs">{entry.endpoint}</code>
                      </div>
                      <div className="text-right text-xs text-zinc-500">
                        <div>{entry.status_code}</div>
                        <div>{new Date(entry.created_at).toLocaleString()}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </main>
  );
}
