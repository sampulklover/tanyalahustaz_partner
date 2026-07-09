import { createAdminClient } from "@/lib/supabase/admin";
import { logError } from "@/lib/logger";

export type RateLimitTier = "chat" | "api" | "playground";

export type RateLimitResult =
  | { ok: true; remaining: { minute: number; day: number } }
  | { ok: false; error: string; retryAfterSeconds: number };

type RateLimitConfig = {
  perMinute: number;
  perDay: number;
};

function isRateLimitEnabled() {
  return process.env.RATE_LIMIT_ENABLED !== "false";
}

function getConfig(tier: RateLimitTier): RateLimitConfig {
  switch (tier) {
    case "chat":
      return {
        perMinute: Number(process.env.RATE_LIMIT_CHAT_PER_MINUTE ?? 20),
        perDay: Number(process.env.RATE_LIMIT_CHAT_PER_DAY ?? 500),
      };
    case "playground":
      return {
        perMinute: Number(process.env.RATE_LIMIT_PLAYGROUND_PER_MINUTE ?? 10),
        perDay: Number(process.env.RATE_LIMIT_PLAYGROUND_PER_DAY ?? 50),
      };
    case "api":
      return {
        perMinute: Number(process.env.RATE_LIMIT_API_PER_MINUTE ?? 60),
        perDay: Number(process.env.RATE_LIMIT_API_PER_DAY ?? 2000),
      };
  }
}

function startOfUtcDay() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function oneMinuteAgo() {
  return new Date(Date.now() - 60_000);
}

function evaluateCounts(
  minuteCount: number,
  dayCount: number,
  config: RateLimitConfig,
): RateLimitResult {
  if (minuteCount >= config.perMinute) {
    return {
      ok: false,
      error: `Rate limit exceeded: ${config.perMinute} requests per minute.`,
      retryAfterSeconds: 60,
    };
  }

  if (dayCount >= config.perDay) {
    return {
      ok: false,
      error: `Daily quota exceeded: ${config.perDay} requests per day.`,
      retryAfterSeconds: 3600,
    };
  }

  return {
    ok: true,
    remaining: {
      minute: Math.max(config.perMinute - minuteCount - 1, 0),
      day: Math.max(config.perDay - dayCount - 1, 0),
    },
  };
}

async function countApiKeyUsage(apiKeyId: string, since: Date) {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("api_usage")
    .select("*", { count: "exact", head: true })
    .eq("api_key_id", apiKeyId)
    .gte("created_at", since.toISOString());

  if (error) {
    logError("Rate limit check failed", error, { apiKeyId });
    return 0;
  }

  return count ?? 0;
}

async function countPlaygroundUsage(userId: string, since: Date) {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("partner_chat_logs")
    .select("*", { count: "exact", head: true })
    .eq("partner_id", userId)
    .is("api_key_id", null)
    .gte("created_at", since.toISOString());

  if (error) {
    logError("Playground rate limit check failed", error, { userId });
    return 0;
  }

  return count ?? 0;
}

export async function checkApiKeyRateLimit(
  apiKeyId: string,
  tier: "chat" | "api",
): Promise<RateLimitResult> {
  if (!isRateLimitEnabled()) {
    return { ok: true, remaining: { minute: 999, day: 999 } };
  }

  const config = getConfig(tier);
  const [minuteCount, dayCount] = await Promise.all([
    countApiKeyUsage(apiKeyId, oneMinuteAgo()),
    countApiKeyUsage(apiKeyId, startOfUtcDay()),
  ]);

  return evaluateCounts(minuteCount, dayCount, config);
}

export async function checkPlaygroundRateLimit(userId: string): Promise<RateLimitResult> {
  if (!isRateLimitEnabled()) {
    return { ok: true, remaining: { minute: 999, day: 999 } };
  }

  const config = getConfig("playground");
  const [minuteCount, dayCount] = await Promise.all([
    countPlaygroundUsage(userId, oneMinuteAgo()),
    countPlaygroundUsage(userId, startOfUtcDay()),
  ]);

  return evaluateCounts(minuteCount, dayCount, config);
}

export function rateLimitHeaders(result: Extract<RateLimitResult, { ok: true }>) {
  return {
    "X-RateLimit-Remaining-Minute": String(result.remaining.minute),
    "X-RateLimit-Remaining-Day": String(result.remaining.day),
  };
}
