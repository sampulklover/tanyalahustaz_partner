import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parsePlaygroundStreamChunk } from "./playground-stream";

describe("parsePlaygroundStreamChunk", () => {
  it("parses complete SSE events and returns the leftover buffer", () => {
    const events: Array<{ type: string }> = [];
    const remainder = parsePlaygroundStreamChunk(
      'data: {"type":"meta","session_id":"abc","sources":[]}\n\ndata: {"type":"text","content":"Hel"}\n\n',
      (event) => events.push(event),
    );

    assert.equal(events.length, 2);
    assert.equal(events[0]?.type, "meta");
    assert.equal(events[1]?.type, "text");
    assert.equal(remainder, "");
  });

  it("keeps partial chunks in the buffer", () => {
    const events: Array<{ type: string }> = [];
    const remainder = parsePlaygroundStreamChunk(
      'data: {"type":"text","content":"Hel',
      (event) => events.push(event),
    );

    assert.equal(events.length, 0);
    assert.equal(remainder, 'data: {"type":"text","content":"Hel');
  });
});
