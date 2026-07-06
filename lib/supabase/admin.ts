import { createClient } from "@supabase/supabase-js";

const PLACEHOLDER_KEYS = new Set(["your-service-role-key", "your-secret-key"]);

function getSupabaseSecretKey() {
  return process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = getSupabaseSecretKey();

  if (!url || !secretKey) {
    throw new Error(
      "Supabase admin credentials missing. Set SUPABASE_SECRET_KEY (sb_secret_...) or SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
  }

  if (PLACEHOLDER_KEYS.has(secretKey)) {
    throw new Error(
      "Supabase secret key is still a placeholder. Copy a secret key from Supabase → Settings → API Keys (sb_secret_...).",
    );
  }

  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
