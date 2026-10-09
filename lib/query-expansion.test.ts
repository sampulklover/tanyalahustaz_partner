import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { expandQuery } from "./query-expansion";

describe("expandQuery", () => {
  it("appends topical synonyms while keeping the original wording first", () => {
    const expanded = expandQuery("hukum minum tuak");
    assert.ok(expanded.startsWith("hukum minum tuak"));
    assert.ok(expanded.includes("arak"));
    assert.ok(expanded.includes("khamr"));
  });

  it("returns the query unchanged when nothing matches", () => {
    const query = "berapa harga kereta hari ini";
    assert.equal(expandQuery(query), query);
  });

  it("does not duplicate a synonym already present", () => {
    const expanded = expandQuery("hukum arak dan khamr");
    // "arak" and "khamr" are already in the query, so no extra copies.
    assert.equal(expanded.split(" ").filter((w) => w === "khamr").length, 1);
    assert.equal(expanded.split(" ").filter((w) => w === "arak").length, 1);
  });

  it("matches whole words only", () => {
    // "berarak" contains "arak" as a substring but is a different word.
    const expanded = expandQuery("mereka berarak di jalan");
    assert.equal(expanded, "mereka berarak di jalan");
  });
});
