import { ChatMarkdown } from "@/components/chat-markdown";
import { createClient } from "@/lib/supabase/server";
import type { PartnerChatLog } from "@/lib/types";

export const metadata = { title: "Chat Logs" };

export default async function ChatLogsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: logs } = await supabase
    .from("partner_chat_logs")
    .select("*")
    .eq("partner_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const items = (logs ?? []) as PartnerChatLog[];

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-3xl font-bold tracking-tight">Chat logs</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          AI chat requests made by your website via <code>/api/v1/chat</code>.
        </p>

        {items.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
            <p className="font-medium">No chat requests yet</p>
            <p className="mt-2 text-sm text-zinc-500">
              POST a message to <code>/api/v1/chat</code> with your API key to test the integration.
            </p>
          </div>
        ) : (
          <ul className="mt-10 space-y-4">
            {items.map((log) => (
              <li
                key={log.id}
                className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                  <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 dark:bg-zinc-800">
                    {log.model}
                  </span>
                  <span className="font-mono">session: {log.session_id}</span>
                  <span>{new Date(log.created_at).toLocaleString()}</span>
                </div>

                <div className="mt-4 space-y-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">User</p>
                    <p className="mt-1 text-sm">{log.user_message}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">
                      Assistant
                    </p>
                    <div className="mt-1">
                      <ChatMarkdown content={log.assistant_message} />
                    </div>
                  </div>
                </div>

                {log.sources?.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Knowledge sources used
                    </p>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {log.sources.map((source) => (
                        <li
                          key={source.slug}
                          className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        >
                          {source.title}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
  );
}
