"use server";

import { revalidatePath } from "next/cache";
import { generateApiKey } from "@/lib/api-keys";
import { createClient } from "@/lib/supabase/server";

export async function createApiKey(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "Key name is required." };
  }

  const { fullKey, keyHash, displayPrefix } = generateApiKey();

  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      user_id: user.id,
      name,
      key_prefix: displayPrefix,
      key_hash: keyHash,
    })
    .select("id, name, key_prefix, created_at")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/api-keys");

  return {
    key: {
      id: data.id,
      name: data.name,
      key_prefix: data.key_prefix,
      created_at: data.created_at,
      secret: fullKey,
    },
  };
}

export async function revokeApiKey(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const keyId = String(formData.get("key_id") ?? "");

  await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", keyId)
    .eq("user_id", user.id)
    .is("revoked_at", null);

  revalidatePath("/dashboard/api-keys");
}
