import { createHash, randomBytes } from "crypto";

const KEY_PREFIX = "tlh_live_";

export function generateApiKey() {
  const secret = randomBytes(24).toString("base64url");
  const fullKey = `${KEY_PREFIX}${secret}`;
  const keyHash = hashApiKey(fullKey);
  const displayPrefix = `${fullKey.slice(0, 16)}…`;

  return {
    fullKey,
    keyHash,
    displayPrefix,
  };
}

export function hashApiKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export function extractApiKeyFromRequest(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }

  const apiKeyHeader = request.headers.get("x-api-key");
  if (apiKeyHeader) {
    return apiKeyHeader.trim();
  }

  return null;
}
