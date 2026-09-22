const DAY_MS = 24 * 60 * 60 * 1000;

export const USAGE_RANGE_OPTIONS = [7, 30, 90] as const;

export type UsageRangeDays = (typeof USAGE_RANGE_OPTIONS)[number];

export function resolveUsageRange(value: string | undefined): UsageRangeDays {
  const parsed = Number(value);
  return (USAGE_RANGE_OPTIONS as readonly number[]).includes(parsed)
    ? (parsed as UsageRangeDays)
    : 30;
}

export function getUsageSinceIso(days: number) {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

export function getNowMs() {
  return Date.now();
}

export function getUsageDayKeys(days: number) {
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    keys.push(new Date(Date.now() - i * DAY_MS).toISOString().slice(0, 10));
  }
  return keys;
}
