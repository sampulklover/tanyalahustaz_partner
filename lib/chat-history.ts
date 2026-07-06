import { createAdminClient } from "@/lib/supabase/admin";

export type ChatHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

const MAX_HISTORY_LOGS = 8;

export async function loadChatHistory({
  partnerId,
  sessionId,
}: {
  partnerId: string;
  sessionId?: string;
}): Promise<ChatHistoryMessage[]> {
  if (!sessionId?.trim()) {
    return [];
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("partner_chat_logs")
    .select("user_message, assistant_message")
    .eq("partner_id", partnerId)
    .eq("session_id", sessionId.trim())
    .order("created_at", { ascending: true })
    .limit(MAX_HISTORY_LOGS);

  if (error || !data) {
    return [];
  }

  const history: ChatHistoryMessage[] = [];

  for (const row of data) {
    history.push({ role: "user", content: row.user_message });
    history.push({ role: "assistant", content: row.assistant_message });
  }

  return history;
}
