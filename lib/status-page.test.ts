import assert from "node:assert/strict";
import { test } from "node:test";
import {
  deriveIncidents,
  type DailyUsage,
  type UsageHistory,
} from "@/lib/status-page";
import type { Translator } from "@/lib/i18n/translator";

const t = ((key: string, vars?: Record<string, string | number>) => {
  if (!vars) return key;
  return Object.entries(vars).reduce(
    (acc, [name, value]) => acc.replaceAll(`{${name}}`, String(value)),
    key,
  );
}) as Translator;

function history(
  all: Record<string, DailyUsage>,
  chat: Record<string, DailyUsage> = {},
): UsageHistory {
  return { all: new Map(Object.entries(all)), chat: new Map(Object.entries(chat)) };
}

test("healthy days produce no incidents", () => {
  const incidents = deriveIncidents(
    history({ "2026-09-15": { total: 100, failures: 0 } }),
    t,
  );
  assert.equal(incidents.length, 0);
});

test("a day with a majority failure is a critical API incident", () => {
  const incidents = deriveIncidents(
    history({ "2026-09-15": { total: 100, failures: 60 } }),
    t,
  );
  assert.equal(incidents.length, 1);
  assert.deepEqual(incidents[0].affectedServices, ["api", "auth"]);
  assert.equal(incidents[0].severity, "critical");
  assert.equal(incidents[0].auto, true);
  assert.equal(incidents[0].date, "2026-09-15");
});

test("a chat-only failure only affects the chat service", () => {
  const incidents = deriveIncidents(
    history(
      { "2026-09-15": { total: 100, failures: 0 } },
      { "2026-09-15": { total: 10, failures: 3 } },
    ),
    t,
  );
  assert.equal(incidents.length, 1);
  assert.deepEqual(incidents[0].affectedServices, ["chat"]);
  assert.equal(incidents[0].severity, "major");
});

test("a tiny sample with one failure is degraded, not an outage", () => {
  const incidents = deriveIncidents(
    history({ "2026-09-15": { total: 2, failures: 1 } }),
    t,
  );
  assert.equal(incidents.length, 1);
  assert.equal(incidents[0].severity, "minor");
});

test("incidents are newest-first and capped by limit", () => {
  const many: Record<string, DailyUsage> = {};
  for (let day = 1; day <= 20; day += 1) {
    const key = `2026-09-${String(day).padStart(2, "0")}`;
    many[key] = { total: 100, failures: 80 };
  }

  const incidents = deriveIncidents(history(many), t, { limit: 5 });
  assert.equal(incidents.length, 5);
  assert.equal(incidents[0].date, "2026-09-20");
  assert.equal(incidents[4].date, "2026-09-16");
});

test("today is marked investigating when the live check is down", () => {
  const today = new Date().toISOString().slice(0, 10);
  const incidents = deriveIncidents(
    history({ [today]: { total: 50, failures: 50 } }),
    t,
    { liveOperational: false },
  );
  assert.equal(incidents[0].status, "investigating");
});
