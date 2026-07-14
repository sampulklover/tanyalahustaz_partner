import { randomUUID } from "crypto";
import type { ChatHistoryMessage } from "@/lib/chat-history";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export function getOpenRouterModel() {
  return process.env.OPENROUTER_MODEL ?? "google/gemini-2.0-flash-001";
}

function getOpenRouterApiKey() {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured on the server.");
  }

  return apiKey;
}

function buildOpenRouterHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    "X-Title": "TanyaLah Ustaz Developers",
  };
}

function mapOpenRouterError(status: number, errorBody: string) {
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
}: {
  userMessage: string;
  knowledgeContext: string;
  history?: ChatHistoryMessage[];
}): ChatMessage[] {
  const systemMessage: ChatMessage = {
    role: "system",
    content: `You are the TanyaLah Ustaz AI assistant for partner websites.
Answer in clear, respectful language suitable for Muslim users seeking Islamic guidance.
Use the KNOWLEDGE CONTEXT below as your primary source. If the context does not cover the question, say you are unsure and recommend consulting a qualified local scholar.
Do not invent fatwas or cite sources not in the context.
Keep answers concise and practical for website visitors.
When the user refers to earlier messages in this conversation, use the chat history together with the knowledge context.

KNOWLEDGE CONTEXT:
${knowledgeContext}`,
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
}: {
  userMessage: string;
  knowledgeContext: string;
  history?: ChatHistoryMessage[];
}) {
  const apiKey = getOpenRouterApiKey();
  const model = getOpenRouterModel();
  const messages = buildChatMessages({ userMessage, knowledgeContext, history });

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: buildOpenRouterHeaders(apiKey),
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    mapOpenRouterError(response.status, errorBody);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const reply = payload.choices?.[0]?.message?.content?.trim();

  if (!reply) {
    throw new Error("OpenRouter returned an empty response.");
  }

  return { reply, model };
}

export async function streamChatReply({
  userMessage,
  knowledgeContext,
  history = [],
  signal,
}: {
  userMessage: string;
  knowledgeContext: string;
  history?: ChatHistoryMessage[];
  signal?: AbortSignal;
}) {
  const apiKey = getOpenRouterApiKey();
  const model = getOpenRouterModel();
  const messages = buildChatMessages({ userMessage, knowledgeContext, history });

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: buildOpenRouterHeaders(apiKey),
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
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
                };
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
