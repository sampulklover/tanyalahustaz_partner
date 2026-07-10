export type PlaygroundStreamEvent =
  | { type: "meta"; session_id: string; sources: import("@/lib/types").KnowledgeSource[] }
  | { type: "text"; content: string }
  | { type: "done" }
  | { type: "error"; message: string };

export function encodePlaygroundStreamEvent(event: PlaygroundStreamEvent) {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export function createPlaygroundSseStream(
  handler: (send: (event: PlaygroundStreamEvent) => void) => Promise<void>,
) {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: PlaygroundStreamEvent) => {
        controller.enqueue(encoder.encode(encodePlaygroundStreamEvent(event)));
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

export function parsePlaygroundStreamChunk(
  buffer: string,
  onEvent: (event: PlaygroundStreamEvent) => void,
) {
  const events: PlaygroundStreamEvent[] = [];
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
      const event = JSON.parse(payload) as PlaygroundStreamEvent;
      events.push(event);
      onEvent(event);
    } catch {
      // Ignore malformed SSE payloads.
    }
  }

  return remainder;
}
