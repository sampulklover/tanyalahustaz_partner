import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_SYSTEM_PROMPT, PROMPT_MAX_CHARS } from "@/lib/ai-prompt";
import {
  PROMPT_MODULES,
  PROMPT_MODULE_IDS,
  type PromptModuleId,
} from "@/lib/prompts/modules";

const CACHE_TTL_MS = 30_000;
let cached: { at: number; prompt: string } | null = null;
let cachedModules: { at: number; prompts: Record<PromptModuleId, string> } | null = null;

export function clearSystemPromptCache() {
  cached = null;
  cachedModules = null;
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

/**
 * A partner's own extra instructions ("API owner" customisation).
 * Layered on top of the shared prompt so the base guard rails stay intact.
 */
export async function getPartnerPrompt(userId: string): Promise<string> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("profiles")
      .select("prompt_instructions")
      .eq("id", userId)
      .maybeSingle();

    return typeof data?.prompt_instructions === "string"
      ? data.prompt_instructions.trim()
      : "";
  } catch {
    return "";
  }
}

export async function savePartnerPrompt(userId: string, prompt: string): Promise<void> {
  const value = prompt.trim();

  if (value.length > PROMPT_MAX_CHARS) {
    throw new Error(`Prompt must be ${PROMPT_MAX_CHARS} characters or fewer.`);
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ prompt_instructions: value || null })
    .eq("id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * The prompt actually sent to the model: the shared (admin) prompt, plus the
 * partner's extra instructions when they have set any.
 */
export async function getEffectiveSystemPrompt(
  partnerId?: string | null,
): Promise<string> {
  const base = await getSystemPrompt();

  if (!partnerId) {
    return base;
  }

  const partnerPrompt = await getPartnerPrompt(partnerId);

  if (!partnerPrompt) {
    return base;
  }

  return `${base}\n\nPARTNER-SPECIFIC INSTRUCTIONS (set by the API owner):\n${partnerPrompt}`;
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

/**
 * The effective prompt text for every specialty module: the admin override
 * when one is set, otherwise the built-in module from lib/prompts/modules.ts.
 */
export async function getModulePrompts(): Promise<Record<PromptModuleId, string>> {
  if (cachedModules && Date.now() - cachedModules.at < CACHE_TTL_MS) {
    return cachedModules.prompts;
  }

  const prompts = Object.fromEntries(
    PROMPT_MODULE_IDS.map((id) => [id, PROMPT_MODULES[id].text]),
  ) as Record<PromptModuleId, string>;

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("ai_settings")
      .select("module_prompts")
      .eq("id", "default")
      .maybeSingle();

    const overrides = data?.module_prompts;

    if (overrides && typeof overrides === "object") {
      for (const id of PROMPT_MODULE_IDS) {
        const value = (overrides as Record<string, unknown>)[id];
        if (typeof value === "string" && value.trim().length > 0) {
          prompts[id] = value.trim();
        }
      }
    }
  } catch {
    // Table/column missing or DB unavailable — use the built-in modules.
  }

  cachedModules = { at: Date.now(), prompts };
  return prompts;
}

/** Read the stored module overrides plus metadata for the admin editor. */
export async function getModulePromptSettings(): Promise<{
  customPrompts: Partial<Record<PromptModuleId, string>>;
  updatedAt: string | null;
}> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("ai_settings")
      .select("module_prompts, updated_at")
      .eq("id", "default")
      .maybeSingle();

    const overrides = data?.module_prompts;
    const customPrompts: Partial<Record<PromptModuleId, string>> = {};

    if (overrides && typeof overrides === "object") {
      for (const id of PROMPT_MODULE_IDS) {
        const value = (overrides as Record<string, unknown>)[id];
        if (typeof value === "string" && value.trim().length > 0) {
          customPrompts[id] = value;
        }
      }
    }

    return {
      customPrompts,
      updatedAt: typeof data?.updated_at === "string" ? data.updated_at : null,
    };
  } catch {
    return { customPrompts: {}, updatedAt: null };
  }
}

/**
 * Save one module's override. An empty value clears the override so the module
 * falls back to the built-in text.
 */
export async function saveModulePrompt(
  moduleId: PromptModuleId,
  prompt: string,
  userId: string | null,
): Promise<void> {
  if (!PROMPT_MODULE_IDS.includes(moduleId)) {
    throw new Error(`Unknown prompt module: ${moduleId}`);
  }

  const value = prompt.trim();

  if (value.length > PROMPT_MAX_CHARS) {
    throw new Error(`Prompt must be ${PROMPT_MAX_CHARS} characters or fewer.`);
  }

  const admin = createAdminClient();

  // Merge into the existing overrides so saving one module keeps the others.
  const { data: current } = await admin
    .from("ai_settings")
    .select("module_prompts")
    .eq("id", "default")
    .maybeSingle();

  const merged: Record<string, string> =
    current?.module_prompts && typeof current.module_prompts === "object"
      ? { ...(current.module_prompts as Record<string, string>) }
      : {};

  if (value) {
    merged[moduleId] = value;
  } else {
    delete merged[moduleId];
  }

  const { error } = await admin.from("ai_settings").upsert(
    {
      id: "default",
      module_prompts: merged,
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
