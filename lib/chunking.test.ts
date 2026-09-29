import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { chunkArticleText } from "./chunking";

describe("chunkArticleText", () => {
  it("splits a single huge paragraph into bounded chunks", () => {
    // Extracted PDF text often has no blank lines — one giant paragraph.
    const content = "kata ".repeat(4000); // ~20k chars

    const chunks = chunkArticleText({ title: "E-book", summary: "Summary", content });

    assert.ok(chunks.length > 1, "expected more than one chunk");
    for (const chunk of chunks) {
      // Allow for the short title prefix added to each chunk.
      assert.ok(
        chunk.length <= 900 + "E-book. ".length + 160,
        `chunk too large: ${chunk.length}`,
      );
    }
  });

  it("packs short paragraphs together without exceeding the limit", () => {
    const content = Array.from({ length: 20 }, (_, i) => `Paragraph number ${i}.`).join("\n\n");

    const chunks = chunkArticleText({ title: "T", summary: "S", content });

    assert.ok(chunks.length >= 1);
    for (const chunk of chunks) {
      assert.ok(chunk.length <= 900 + "T. ".length + 40);
    }
  });

  it("returns just the intro when there is no content", () => {
    const chunks = chunkArticleText({ title: "Niat", summary: "About intention", content: "" });

    assert.deepEqual(chunks, ["Niat. About intention"]);
  });
});
