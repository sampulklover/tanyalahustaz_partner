"use server";

import { executeChat } from "@/lib/chat";
import { createClient } from "@/lib/supabase/server";
import type { ChatResponse } from "@/lib/types";

export type PlaygroundResult =
  | { ok: true; data: ChatResponse }
  | { ok: false; error: string };

export async function sendPlaygroundMessage(formData: FormData): Promise<PlaygroundResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "You must be signed in." };
  }

  const message = String(formData.get("message") ?? "");
  const sessionId = String(formData.get("session_id") ?? "").trim() || undefined;
  const category = String(formData.get("category") ?? "").trim() || undefined;

  return executeChat({
    message,
    sessionId,
    category: category === "all" ? undefined : category,
    partnerId: user.id,
    apiKeyId: null,
  });
}
