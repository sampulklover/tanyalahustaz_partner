import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeChargeCents,
  DEFAULT_MARKUP_PERCENT,
  MAX_MARKUP_PERCENT,
  MIN_MARKUP_PERCENT,
  normalizeMarkupPercent,
} from "./billing";

describe("normalizeMarkupPercent", () => {
  it("lifts anything below the 30% floor up to the minimum", () => {
    assert.equal(normalizeMarkupPercent(0), MIN_MARKUP_PERCENT);
    assert.equal(normalizeMarkupPercent(10), MIN_MARKUP_PERCENT);
    assert.equal(normalizeMarkupPercent(-5), MIN_MARKUP_PERCENT);
  });

  it("keeps valid values and caps very large ones", () => {
    assert.equal(normalizeMarkupPercent(30), 30);
    assert.equal(normalizeMarkupPercent(45.5), 45.5);
    assert.equal(normalizeMarkupPercent(5000), MAX_MARKUP_PERCENT);
  });

  it("falls back to the default for non-numbers", () => {
    assert.equal(normalizeMarkupPercent(Number.NaN), DEFAULT_MARKUP_PERCENT);
  });
});

describe("computeChargeCents", () => {
  it("returns 0 when there is no cost", () => {
    assert.equal(computeChargeCents(0, 30, 4.7), 0);
    assert.equal(computeChargeCents(Number.NaN, 30, 4.7), 0);
  });

  it("applies markup and the USD→MYR rate", () => {
    // 1 USD * 1.3 * 4.7 = 6.11 MYR = 611 sen
    assert.equal(computeChargeCents(1, 30, 4.7), 611);
  });

  it("never undercharges by rounding up to the nearest sen", () => {
    // 0.001 USD * 1.3 * 4.7 = 0.00611 MYR = 0.611 sen → 1 sen
    assert.equal(computeChargeCents(0.001, 30, 4.7), 1);
  });

  it("enforces the 30% floor even if a lower markup is passed", () => {
    assert.equal(computeChargeCents(1, 10, 4.7), computeChargeCents(1, 30, 4.7));
  });
});
