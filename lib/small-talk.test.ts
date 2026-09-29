import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isSmallTalk } from "./small-talk";

describe("isSmallTalk", () => {
  it("detects common greetings", () => {
    assert.equal(isSmallTalk("hi"), true);
    assert.equal(isSmallTalk("hello"), true);
    assert.equal(isSmallTalk("hi how are you"), true);
    assert.equal(isSmallTalk("Assalamualaikum"), true);
    assert.equal(isSmallTalk("apa khabar"), true);
    assert.equal(isSmallTalk("thanks!"), true);
    assert.equal(isSmallTalk("ok"), true);
  });

  it("treats real questions as knowledge questions", () => {
    assert.equal(isSmallTalk("what is zakat"), false);
    assert.equal(isSmallTalk("Can a traveler combine Dhuhr and Asr?"), false);
    assert.equal(isSmallTalk("hukum wanita dalam iddah"), false);
    assert.equal(isSmallTalk("how do I pay zakat on gold"), false);
  });

  it("does not treat a greeting followed by a question as small talk", () => {
    assert.equal(isSmallTalk("hi, can you explain zakat"), false);
    assert.equal(isSmallTalk("salam ustaz, apa hukum qasar solat"), false);
  });
});
