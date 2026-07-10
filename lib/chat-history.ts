import { createAdminClient } from "@/lib/supabase/admin";
import type { KnowledgeSource } from "@/lib/types";

export type ChatHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export type PlaygroundSessionMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: KnowledgeSource[];
  createdAt: string;
};

const MAX_HISTORY_LOGS = 8;
const MAX_PLAYGROUND_SESSION_LOGS = 50;

function normalizeSources(value: unknown): KnowledgeSource[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;

  const sources = value.filter((entry): entry is KnowledgeSource => {
    if (!entry || typeof entry !== "object") return false;
    const source = entry as Record<string, unknown>;
    return (
      typeof source.slug === "string" &&
      typeof source.title === "string" &&
      typeof source.category === "string"
    );
  });

  return sources.length > 0 ? sources : undefined;
}

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

export async function loadPlaygroundSessionMessages({
  partnerId,
  sessionId,
}: {
  partnerId: string;
  sessionId: string;
}): Promise<PlaygroundSessionMessage[]> {
  const trimmedSessionId = sessionId.trim();
  if (!trimmedSessionId) return [];

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("partner_chat_logs")
    .select("id, user_message, assistant_message, sources, created_at")
    .eq("partner_id", partnerId)
    .eq("session_id", trimmedSessionId)
    .is("api_key_id", null)
    .order("created_at", { ascending: true })
    .limit(MAX_PLAYGROUND_SESSION_LOGS);

  if (error || !data) {
    return [];
  }

  const messages: PlaygroundSessionMessage[] = [];

  for (const row of data) {
    messages.push({
      id: `${row.id}-user`,
      role: "user",
      content: row.user_message,
      createdAt: row.created_at,
    });
    messages.push({
      id: `${row.id}-assistant`,
      role: "assistant",
      content: row.assistant_message,
      sources: normalizeSources(row.sources),
      createdAt: row.created_at,
    });
  }

  return messages;
}
