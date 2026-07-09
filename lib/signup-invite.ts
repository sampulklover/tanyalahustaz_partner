import { createHash, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export type SignupMode = "open" | "invite";

export function getSignupMode(): SignupMode {
  return process.env.SIGNUP_MODE === "open" ? "open" : "invite";
}

export function isInviteRequired() {
  return getSignupMode() !== "open";
}

export function hashInviteCode(code: string) {
  return createHash("sha256").update(code.trim().toLowerCase()).digest("hex");
}

function envInviteCodes() {
  return (process.env.SIGNUP_INVITE_CODES ?? "")
    .split(",")
    .map((code) => code.trim().toLowerCase())
    .filter(Boolean);
}

function matchesEnvInvite(code: string) {
  const normalized = code.trim().toLowerCase();
  return envInviteCodes().some((entry) => {
    if (entry.length !== normalized.length) {
      return false;
    }
    return timingSafeEqual(Buffer.from(entry), Buffer.from(normalized));
  });
}

type InviteRow = {
  id: string;
  email: string | null;
  max_uses: number;
  uses_count: number;
  expires_at: string | null;
  revoked_at: string | null;
};

function isInviteRowValid(row: InviteRow, email: string) {
  if (row.revoked_at) {
    return false;
  }

  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    return false;
  }

  if (row.uses_count >= row.max_uses) {
    return false;
  }

  if (row.email && row.email.toLowerCase() !== email.toLowerCase()) {
    return false;
  }

  return true;
}

export async function validateSignupInvite(code: string, email: string) {
  if (!isInviteRequired()) {
    return { ok: true as const };
  }

  const trimmed = code.trim();
  if (!trimmed) {
    return { ok: false as const, error: "An invite code is required to create an account." };
  }

  if (matchesEnvInvite(trimmed)) {
    return { ok: true as const, source: "env" as const };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("partner_signup_invites")
    .select("id, email, max_uses, uses_count, expires_at, revoked_at")
    .eq("code_hash", hashInviteCode(trimmed))
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data || !isInviteRowValid(data as InviteRow, email)) {
    return { ok: false as const, error: "Invalid or expired invite code." };
  }

  return { ok: true as const, source: "database" as const, inviteId: data.id };
}

export async function consumeSignupInvite(
  code: string,
  validation: { source: "env" | "database"; inviteId?: string },
) {
  if (validation.source === "env") {
    return;
  }

  if (!validation.inviteId) {
    return;
  }

  const admin = createAdminClient();
  const { data: invite, error: fetchError } = await admin
    .from("partner_signup_invites")
    .select("uses_count, max_uses")
    .eq("id", validation.inviteId)
    .single();

  if (fetchError || !invite) {
    return;
  }

  if (invite.uses_count >= invite.max_uses) {
    return;
  }

  await admin
    .from("partner_signup_invites")
    .update({ uses_count: invite.uses_count + 1 })
    .eq("id", validation.inviteId);
}
