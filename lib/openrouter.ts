import { randomUUID } from "crypto";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function generateChatReply({
  userMessage,
  knowledgeContext,
}: {
  userMessage: string;
  knowledgeContext: string;
}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL ?? "google/gemini-2.0-flash-001";

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured on the server.");
  }

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You are the TanyaLah Ustaz AI assistant for partner websites.
Answer in clear, respectful language suitable for Muslim users seeking Islamic guidance.
Use the KNOWLEDGE CONTEXT below as your primary source. If the context does not cover the question, say you are unsure and recommend consulting a qualified local scholar.
Do not invent fatwas or cite sources not in the context.
Keep answers concise and practical for website visitors.

KNOWLEDGE CONTEXT:
${knowledgeContext}`,
    },
    {
      role: "user",
      content: userMessage,
    },
  ];

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      "X-Title": "TanyaLah Ustaz Partner API",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenRouter request failed (${response.status}): ${errorBody}`);
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

export function createSessionId(sessionId?: string) {
  return sessionId?.trim() || randomUUID();
}
