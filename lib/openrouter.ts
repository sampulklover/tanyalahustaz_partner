import { randomUUID } from "crypto";
import { composeSystemPrompt } from "@/lib/ai-prompt";
import { getEffectiveSystemPrompt, getModulePrompts } from "@/lib/ai-settings";
import { routePromptModules } from "@/lib/prompts/router";
import type { PromptModuleId } from "@/lib/prompts/modules";
import type { ChatHistoryMessage } from "@/lib/chat-history";
import { isSmallTalk } from "@/lib/small-talk";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
  /** OpenRouter/Anthropic prompt-cache marker. Kept on the stable prefix only. */
  cache_control?: { type: "ephemeral" };
};

/** Cap reply length so answers finish sooner and cost less. 0 disables the cap. */
export function getChatMaxTokens(): number | undefined {
  const raw = Number(process.env.CHAT_MAX_TOKENS ?? 1200);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : undefined;
}

/** Whether to mark the stable system prompt for provider-side prompt caching. */
export function isPromptCacheEnabled(): boolean {
  return process.env.CHAT_PROMPT_CACHE !== "false";
}

/** Token usage and cost reported by OpenRouter on every completion. */
export type ChatUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  /** OpenRouter's cost in USD credits (0 when the model is free). */
  costUsd: number;
};

type RawUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  cost?: number;
};

export function normalizeChatUsage(raw: unknown): ChatUsage | null {
  if (!raw || typeof raw !== "object") return null;

  const usage = raw as RawUsage;
  const promptTokens = Number(usage.prompt_tokens) || 0;
  const completionTokens = Number(usage.completion_tokens) || 0;
  const totalTokens = Number(usage.total_tokens) || promptTokens + completionTokens;
  const costUsd = Number(usage.cost) || 0;

  return { promptTokens, completionTokens, totalTokens, costUsd };
}

export function getOpenRouterModel() {
  return process.env.OPENROUTER_MODEL ?? "google/gemini-2.5-flash";
}

/**
 * The fast model used for greetings and other small talk, where a light model
 * answers just as well but much sooner. Falls back to the main model when unset.
 */
export function getOpenRouterFastModel() {
  return process.env.OPENROUTER_MODEL_FAST ?? getOpenRouterModel();
}

/**
 * Pick the model for a chat turn. Greetings/pleasantries route to the fast
 * model; everything else uses the main (stronger) model.
 */
export function selectChatModel(message: string) {
  return isSmallTalk(message) ? getOpenRouterFastModel() : getOpenRouterModel();
}

export function getOpenRouterApiKey() {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured on the server.");
  }

  return apiKey;
}

export function buildOpenRouterHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    "X-Title": "Tanyalah Ustaz Developers",
  };
}

export function mapOpenRouterError(status: number, errorBody: string) {
  if (status === 401 || errorBody.toLowerCase().includes("invalid api key")) {
    throw new Error(
      "OpenRouter rejected the API key. Check OPENROUTER_API_KEY in .env.local (openrouter.ai → Keys).",
    );
  }

  throw new Error(`OpenRouter request failed (${status}): ${errorBody}`);
}

export function buildChatMessages({
  userMessage,
  knowledgeContext,
  history = [],
  systemPrompt,
  modulePrompts,
  partnerKnowledgeContext,
  promptCache = false,
}: {
  userMessage: string;
  knowledgeContext: string;
  history?: ChatHistoryMessage[];
  systemPrompt?: string;
  /** Admin-resolved module text. Omitting it uses the built-in modules. */
  modulePrompts?: Partial<Record<PromptModuleId, string>>;
  /** The partner's own uploaded material, when any matched. */
  partnerKnowledgeContext?: string;
  promptCache?: boolean;
}): ChatMessage[] {
  // Pick the specialty module(s) for this question. Small talk (greetings) has
  // no inquiry to route, so it uses the shared base only.
  const routed = isSmallTalk(userMessage)
    ? { modules: [] as PromptModuleId[] }
    : routePromptModules(userMessage);

  const systemMessage: ChatMessage = {
    role: "system",
    content: composeSystemPrompt(
      systemPrompt ?? "",
      knowledgeContext,
      routed.modules,
      modulePrompts,
      partnerKnowledgeContext,
    ),
    // The fixed instructions are the stable prefix shared across requests, so
    // providers can reuse their cached computation and cut time-to-first-token.
    ...(promptCache ? { cache_control: { type: "ephemeral" as const } } : {}),
  };

  return [
    systemMessage,
    ...history.map((entry) => ({
      role: entry.role,
      content: entry.content,
    })),
    {
      role: "user",
      content: userMessage,
    },
  ];
}

export async function generateChatReply({
  userMessage,
  knowledgeContext,
  history = [],
  systemPrompt,
  partnerKnowledgeContext,
  partnerId,
}: {
  userMessage: string;
  knowledgeContext: string;
  history?: ChatHistoryMessage[];
  systemPrompt?: string;
  partnerKnowledgeContext?: string;
  partnerId?: string | null;
}) {
  const apiKey = getOpenRouterApiKey();
  const model = selectChatModel(userMessage);
  const resolvedPrompt =
    systemPrompt ?? (await getEffectiveSystemPrompt(partnerId));
  const modulePrompts = await getModulePrompts();
  const messages = buildChatMessages({
    userMessage,
    knowledgeContext,
    history,
    systemPrompt: resolvedPrompt,
    modulePrompts,
    partnerKnowledgeContext,
    promptCache: isPromptCacheEnabled(),
  });

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: buildOpenRouterHeaders(apiKey),
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
      max_tokens: getChatMaxTokens(),
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    mapOpenRouterError(response.status, errorBody);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: unknown;
  };

  const reply = payload.choices?.[0]?.message?.content?.trim();

  if (!reply) {
    throw new Error("OpenRouter returned an empty response.");
  }

  return { reply, model, usage: normalizeChatUsage(payload.usage) };
}

export async function streamChatReply({
  userMessage,
  knowledgeContext,
  history = [],
  signal,
  systemPrompt,
  partnerKnowledgeContext,
  partnerId,
  onUsage,
}: {
  userMessage: string;
  knowledgeContext: string;
  history?: ChatHistoryMessage[];
  signal?: AbortSignal;
  systemPrompt?: string;
  partnerKnowledgeContext?: string;
  partnerId?: string | null;
  onUsage?: (usage: ChatUsage) => void;
}) {
  const apiKey = getOpenRouterApiKey();
  const model = selectChatModel(userMessage);
  const resolvedPrompt =
    systemPrompt ?? (await getEffectiveSystemPrompt(partnerId));
  const modulePrompts = await getModulePrompts();
  const messages = buildChatMessages({
    userMessage,
    knowledgeContext,
    history,
    systemPrompt: resolvedPrompt,
    modulePrompts,
    partnerKnowledgeContext,
    promptCache: isPromptCacheEnabled(),
  });

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: buildOpenRouterHeaders(apiKey),
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
      max_tokens: getChatMaxTokens(),
      stream: true,
    }),
    signal,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    mapOpenRouterError(response.status, errorBody);
  }

  if (!response.body) {
    throw new Error("OpenRouter returned an empty stream.");
  }

  const upstream = response.body;
  const decoder = new TextDecoder();

  return {
    model,
    stream: new ReadableStream<string>({
      async start(controller) {
        const reader = upstream.getReader();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;

              const payload = trimmed.slice(5).trim();
              if (!payload || payload === "[DONE]") continue;

              try {
                const parsed = JSON.parse(payload) as {
                  choices?: Array<{ delta?: { content?: string } }>;
                  usage?: unknown;
                };
                const usage = normalizeChatUsage(parsed.usage);
                if (usage && onUsage) onUsage(usage);

                const content = parsed.choices?.[0]?.delta?.content;
                if (content) controller.enqueue(content);
              } catch {
                // Ignore malformed SSE chunks.
              }
            }
          }

          controller.close();
        } catch (error) {
          controller.error(error);
        } finally {
          reader.releaseLock();
        }
      },
    }),
  };
}

export function createSessionId(sessionId?: string) {
  return sessionId?.trim() || randomUUID();
}

/**
 * Ask the configured model for a JSON object and parse it.
 *
 * Used for server-side structuring tasks (e.g. turning an uploaded document
 * into a knowledge-base article). Falls back to extracting the first JSON
 * object from the reply when the model wraps it in prose or code fences.
 */
export async function generateJsonResponse({
  system,
  user,
  temperature = 0.2,
  maxTokens,
}: {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<{ data: unknown; model: string }> {
  const apiKey = getOpenRouterApiKey();
  const model = getOpenRouterModel();

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: buildOpenRouterHeaders(apiKey),
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    mapOpenRouterError(response.status, errorBody);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("OpenRouter returned an empty response.");
  }

  return { data: parseJsonFromText(content), model };
}

function parseJsonFromText(text: string): unknown {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Fall back to the first {...} block in the reply.
  }

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end > start) {
    return JSON.parse(cleaned.slice(start, end + 1));
  }

  throw new Error("Model response did not contain valid JSON.");
}
