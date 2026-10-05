// Shared server-sent-event contract for streaming chat.
//
// Used on the server (both the public /api/v1/chat endpoint and the playground)
// to encode events, and on the client to parse them. Keeping one definition
// here means the real API and the playground always speak the same protocol.

import type { KnowledgeSource } from "@/lib/types";

export type ChatStreamEvent =
  | { type: "meta"; session_id: string; sources: KnowledgeSource[] }
  | { type: "text"; content: string }
  | { type: "done" }
  | { type: "error"; message: string };

/** Encode an event as one SSE `data:` frame. */
export function encodeChatStreamEvent(event: ChatStreamEvent) {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/** Wrap an async producer as an SSE byte stream for a `Response` body. */
export function createChatSseStream(
  handler: (send: (event: ChatStreamEvent) => void) => Promise<void>,
) {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ChatStreamEvent) => {
        controller.enqueue(encoder.encode(encodeChatStreamEvent(event)));
      };

      try {
        await handler(send);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to generate AI response.";
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });
}

/**
 * Parse whatever complete SSE frames are in `buffer`, invoking `onEvent` for
 * each. Returns the trailing partial frame to carry into the next chunk.
 */
export function parseChatStreamChunk(
  buffer: string,
  onEvent: (event: ChatStreamEvent) => void,
) {
  const parts = buffer.split("\n\n");
  const remainder = parts.pop() ?? "";

  for (const part of parts) {
    const line = part
      .split("\n")
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith("data:"));

    if (!line) continue;

    const payload = line.slice(5).trim();
    if (!payload) continue;

    try {
      const event = JSON.parse(payload) as ChatStreamEvent;
      onEvent(event);
    } catch {
      // Ignore malformed SSE payloads.
    }
  }

  return remainder;
}
