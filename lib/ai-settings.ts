import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_SYSTEM_PROMPT, PROMPT_MAX_CHARS } from "@/lib/ai-prompt";

const CACHE_TTL_MS = 30_000;
let cached: { at: number; prompt: string } | null = null;

export function clearSystemPromptCache() {
  cached = null;
}

/** The admin-customised prompt, falling back to the default. */
export async function getSystemPrompt(): Promise<string> {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.prompt;
  }

  let prompt = DEFAULT_SYSTEM_PROMPT;

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("ai_settings")
      .select("system_prompt")
      .eq("id", "default")
      .maybeSingle();

    const stored = typeof data?.system_prompt === "string" ? data.system_prompt.trim() : "";
    prompt = stored || DEFAULT_SYSTEM_PROMPT;
  } catch {
    // Table missing or DB unavailable — use the default prompt.
  }

  cached = { at: Date.now(), prompt };
  return prompt;
}

/** Read the stored prompt plus metadata for the admin editor. */
export async function getSystemPromptSettings(): Promise<{
  customPrompt: string;
  updatedAt: string | null;
  isCustom: boolean;
}> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("ai_settings")
    .select("system_prompt, updated_at")
    .eq("id", "default")
    .maybeSingle();

  const customPrompt = typeof data?.system_prompt === "string" ? data.system_prompt : "";

  return {
    customPrompt,
    updatedAt: typeof data?.updated_at === "string" ? data.updated_at : null,
    isCustom: customPrompt.trim().length > 0,
  };
}

export async function saveSystemPrompt(prompt: string, userId: string | null): Promise<void> {
  const value = prompt.trim();

  if (value.length > PROMPT_MAX_CHARS) {
    throw new Error(`Prompt must be ${PROMPT_MAX_CHARS} characters or fewer.`);
  }

  const admin = createAdminClient();
  const { error } = await admin.from("ai_settings").upsert(
    {
      id: "default",
      system_prompt: value || null,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) {
    throw new Error(error.message);
  }

  clearSystemPromptCache();
}
