import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { selectDiverseChunks } from "./retrieval";

type Row = { article_id: string; similarity: number };

function rows(...entries: [string, number][]): Row[] {
  return entries.map(([article_id, similarity]) => ({ article_id, similarity }));
}

describe("selectDiverseChunks", () => {
  it("limits how many chunks one article can contribute", () => {
    const input = rows(
      ["a", 0.9],
      ["a", 0.88],
      ["a", 0.86],
      ["b", 0.7],
      ["c", 0.6],
    );

    const picked = selectDiverseChunks(input, { maxChunks: 4, perArticle: 2 });

    assert.deepEqual(
      picked.map((row) => row.article_id),
      ["a", "a", "b", "c"],
    );
  });

  it("stops at maxChunks", () => {
    const input = rows(["a", 0.9], ["b", 0.8], ["c", 0.7], ["d", 0.6]);

    assert.equal(selectDiverseChunks(input, { maxChunks: 2, perArticle: 2 }).length, 2);
  });

  it("returns everything when under the limits", () => {
    const input = rows(["a", 0.9], ["b", 0.8]);

    assert.equal(selectDiverseChunks(input, { maxChunks: 6, perArticle: 2 }).length, 2);
  });
});
