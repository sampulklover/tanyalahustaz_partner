import { ChatPlayground } from "@/components/chat-playground";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Playground" };

export default async function PlaygroundPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Playground</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Test the AI chat API before integrating it into your website. Uses the same
            knowledge base and OpenRouter pipeline as production.
          </p>
        </div>
        <ChatPlayground />
      </main>
  );
}
