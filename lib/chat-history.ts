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

export type ChatSessionSummary = {
  session_id: string;
  turn_count: number;
  created_at: string;
  updated_at: string;
  last_user_message: string;
};

export type ChatSessionMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: KnowledgeSource[];
  created_at: string;
};

const MAX_HISTORY_LOGS = 8;
const MAX_PLAYGROUND_SESSION_LOGS = 50;
const MAX_SESSION_TURNS = 100;

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

function isChatSessionSummary(value: unknown): value is ChatSessionSummary {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.session_id === "string" &&
    typeof row.turn_count === "number" &&
    typeof row.created_at === "string" &&
    typeof row.updated_at === "string" &&
    typeof row.last_user_message === "string"
  );
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

export async function listChatSessions({
  partnerId,
  limit,
  offset,
}: {
  partnerId: string;
  limit: number;
  offset: number;
}): Promise<{ data: ChatSessionSummary[]; total: number } | { error: string }> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("list_partner_chat_sessions", {
    p_partner_id: partnerId,
    p_limit: limit,
    p_offset: offset,
  });

  if (!error) {
    const payload =
      data && typeof data === "object" ? (data as Record<string, unknown>) : null;
    const rows = Array.isArray(payload?.data) ? payload.data.filter(isChatSessionSummary) : [];
    const total =
      typeof payload?.total === "number" && Number.isFinite(payload.total)
        ? payload.total
        : rows.length;

    return { data: rows, total };
  }

  // Fallback when the RPC migration has not been applied yet.
  const { data: logs, error: logsError } = await admin
    .from("partner_chat_logs")
    .select("session_id, user_message, created_at")
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false });

  if (logsError) {
    return { error: "Failed to load chat sessions." };
  }

  const bySession = new Map<string, ChatSessionSummary>();

  for (const row of logs ?? []) {
    const existing = bySession.get(row.session_id);
    if (!existing) {
      bySession.set(row.session_id, {
        session_id: row.session_id,
        turn_count: 1,
        created_at: row.created_at,
        updated_at: row.created_at,
        last_user_message: row.user_message,
      });
      continue;
    }

    existing.turn_count += 1;
    existing.created_at = row.created_at;
  }

  const all = Array.from(bySession.values()).sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );

  return {
    data: all.slice(offset, offset + limit),
    total: all.length,
  };
}

export async function loadChatSessionMessages({
  partnerId,
  sessionId,
  limit,
  offset,
}: {
  partnerId: string;
  sessionId: string;
  limit: number;
  offset: number;
}): Promise<
  | { found: false }
  | { found: true; data: ChatSessionMessage[]; total: number }
  | { error: string }
> {
  const trimmedSessionId = sessionId.trim();
  if (!trimmedSessionId) {
    return { found: false };
  }

  const turnLimit = Math.min(Math.max(limit, 1), MAX_SESSION_TURNS);
  const turnOffset = Math.max(offset, 0);
  const admin = createAdminClient();

  const [{ count, error: countError }, { data, error }] = await Promise.all([
    admin
      .from("partner_chat_logs")
      .select("id", { count: "exact", head: true })
      .eq("partner_id", partnerId)
      .eq("session_id", trimmedSessionId),
    admin
      .from("partner_chat_logs")
      .select("id, user_message, assistant_message, sources, created_at")
      .eq("partner_id", partnerId)
      .eq("session_id", trimmedSessionId)
      .order("created_at", { ascending: true })
      .range(turnOffset, turnOffset + turnLimit - 1),
  ]);

  if (countError || error) {
    return { error: "Failed to load chat history." };
  }

  const total = count ?? 0;
  if (total === 0) {
    return { found: false };
  }

  const messages: ChatSessionMessage[] = [];

  for (const row of data ?? []) {
    messages.push({
      id: `${row.id}-user`,
      role: "user",
      content: row.user_message,
      created_at: row.created_at,
    });
    messages.push({
      id: `${row.id}-assistant`,
      role: "assistant",
      content: row.assistant_message,
      sources: normalizeSources(row.sources),
      created_at: row.created_at,
    });
  }

  return { found: true, data: messages, total };
}

export async function deleteChatSession({
  partnerId,
  sessionId,
}: {
  partnerId: string;
  sessionId: string;
}): Promise<{ found: false } | { found: true; deleted_turns: number } | { error: string }> {
  const trimmedSessionId = sessionId.trim();
  if (!trimmedSessionId) {
    return { found: false };
  }

  const admin = createAdminClient();

  const { count, error: countError } = await admin
    .from("partner_chat_logs")
    .select("id", { count: "exact", head: true })
    .eq("partner_id", partnerId)
    .eq("session_id", trimmedSessionId);

  if (countError) {
    return { error: "Failed to delete chat session." };
  }

  const deletedTurns = count ?? 0;
  if (deletedTurns === 0) {
    return { found: false };
  }

  const { error } = await admin
    .from("partner_chat_logs")
    .delete()
    .eq("partner_id", partnerId)
    .eq("session_id", trimmedSessionId);

  if (error) {
    return { error: "Failed to delete chat session." };
  }

  return { found: true, deleted_turns: deletedTurns };
}

export async function deleteAllChatSessions({
  partnerId,
}: {
  partnerId: string;
}): Promise<{ deleted_turns: number } | { error: string }> {
  const admin = createAdminClient();

  const { count, error: countError } = await admin
    .from("partner_chat_logs")
    .select("id", { count: "exact", head: true })
    .eq("partner_id", partnerId);

  if (countError) {
    return { error: "Failed to delete chat sessions." };
  }

  const deletedTurns = count ?? 0;
  if (deletedTurns === 0) {
    return { deleted_turns: 0 };
  }

  const { error } = await admin
    .from("partner_chat_logs")
    .delete()
    .eq("partner_id", partnerId);

  if (error) {
    return { error: "Failed to delete chat sessions." };
  }

  return { deleted_turns: deletedTurns };
}
