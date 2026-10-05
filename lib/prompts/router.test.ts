import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { routePromptModules } from "./router";
import { PROMPT_MODULES } from "./modules";

describe("routePromptModules", () => {
  it("routes fiqh questions to the fiqh module", () => {
    const result = routePromptModules("Apakah hukum solat tanpa wuduk?");
    assert.ok(result.modules.includes("fiqh"));
    assert.equal(result.matched, true);
  });

  it("routes tafsir questions to the tafsir module", () => {
    const result = routePromptModules("Terangkan tafsir ayat kursi dan tadabbur-nya");
    assert.equal(result.modules[0], "tafsir");
  });

  it("routes hadith questions to the hadith module", () => {
    const result = routePromptModules("Apakah syarah hadis tentang kasih sayang?");
    assert.equal(result.modules[0], "hadith");
  });

  it("routes muamalat questions to the muamalat module", () => {
    const result = routePromptModules("Berapa nisab zakat emas dan cara kira fidyah?");
    assert.equal(result.modules[0], "muamalat");
  });

  it("routes doa questions to the hadith module", () => {
    const result = routePromptModules("Doa untuk menghilangkan keresahan hati");
    assert.equal(result.modules[0], "hadith");
  });

  it("falls back to fiqh and marks unmatched when nothing hits", () => {
    const result = routePromptModules("hello there");
    assert.deepEqual(result.modules, ["fiqh"]);
    assert.equal(result.matched, false);
  });

  it("never returns an empty module list", () => {
    for (const message of ["", "???", "random words here"]) {
      assert.ok(routePromptModules(message).modules.length >= 1);
    }
  });

  it("can attach a second module for a spanning question", () => {
    const result = routePromptModules(
      "Apakah hukum zakat dan apakah hadis yang menyokongnya?",
    );
    assert.ok(result.modules.includes("muamalat"));
    assert.ok(result.modules.length <= 2);
  });
});

describe("prompt modules", () => {
  it("every module has a non-trivial prompt body", () => {
    for (const entry of Object.values(PROMPT_MODULES)) {
      assert.ok(entry.text.length > 400, `${entry.id} is too short`);
    }
  });
});
