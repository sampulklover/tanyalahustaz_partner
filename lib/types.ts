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
};

export type ChatResponse = {
  reply: string;
  session_id: string;
  sources: KnowledgeSource[];
};
