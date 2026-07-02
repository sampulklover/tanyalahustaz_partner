export type Profile = {
  id: string;
  email: string;
  company_name: string | null;
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
};
