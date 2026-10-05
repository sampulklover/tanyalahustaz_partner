export type KnowledgeTeamMember = {
  user_id: string;
  role: import("@/lib/roles").KnowledgeTeamRole;
  granted_by: string | null;
  created_at: string;
  updated_at: string;
};

export type KnowledgeTeamMemberWithProfile = KnowledgeTeamMember & {
  email: string;
  company_name: string | null;
};

export type Profile = {
  id: string;
  email: string;
  company_name: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
};

export type ApiKey = {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

export type ApiKeyWithSecret = ApiKey & {
  secret: string;
};

export type AuthenticatedApiContext = {
  apiKeyId: string;
  userId: string;
  keyName: string;
  requestId: string;
};

export type ApiUsageEntry = {
  id: number;
  api_key_id: string | null;
  endpoint: string;
  method: string;
  status_code: number | null;
  created_at: string;
};

export type KnowledgeArticle = {
  id: string;
  slug: string;
  title: string;
  category: string;
  summary: string;
  content: string;
  tags: string[];
  published: boolean;
  created_at: string;
  updated_at: string;
  /** Set when the article is a read-only mirror of an external source (e.g. "gcs"). */
  source_provider?: string | null;
  /** Bucket object path for mirrored articles. */
  source_path?: string | null;
  source_etag?: string | null;
  source_synced_at?: string | null;
  /** Source file size in bytes (mirrored articles only). */
  source_size?: number | null;
  /** OpenRouter embedding cost in USD to make this article searchable. */
  embed_cost_usd?: number | null;
  embed_prompt_tokens?: number | null;
  embed_chunks?: number | null;
  embed_model?: string | null;
  embed_updated_at?: string | null;
};

export type KnowledgeSyncFailure = { path: string; error: string };

export type KnowledgeSyncRun = {
  id: string;
  provider: string;
  status: "running" | "completed" | "failed";
  files_seen: number;
  created_count: number;
  updated_count: number;
  removed_count: number;
  skipped_count: number;
  deferred_count: number;
  failed: KnowledgeSyncFailure[];
  error: string | null;
  embed_job_id: string | null;
  /** Total OpenRouter embedding cost (USD) for the files this run queued. */
  embed_cost_usd?: number | null;
  embed_prompt_tokens?: number | null;
  created_by: string | null;
  started_at: string;
  finished_at: string | null;
};

export type KnowledgeSource = {
  slug: string;
  title: string;
  category: string;
};

export type RetrievedKnowledge = {
  articleId: string;
  slug: string;
  title: string;
  category: string;
  content: string;
  similarity?: number;
};

export type PartnerChatLog = {
  id: string;
  partner_id: string;
  api_key_id: string | null;
  session_id: string;
  user_message: string;
  assistant_message: string;
  model: string;
  sources: KnowledgeSource[];
  created_at: string;
};

export type ChatRequestBody = {
  message: string;
  session_id?: string;
  category?: string;
  /** When true, the reply is delivered as server-sent events (SSE). */
  stream?: boolean;
};

export type ChatResponse = {
  reply: string;
  session_id: string;
  sources: KnowledgeSource[];
};
