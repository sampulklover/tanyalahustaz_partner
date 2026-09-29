/** Client-safe billing constants and formatting. No server SDK imports here. */

/** Top-up presets in the smallest currency unit (sen for MYR). */
export const TOPUP_PRESETS_MYR = [1000, 2000, 5000, 10000, 20000, 50000] as const;

export const MIN_TOPUP_CENTS = 1000;
export const MAX_TOPUP_CENTS = 1000000;

/**
 * Tanyalah Ustaz must make at least this margin on AI usage.
 * Admins can raise the markup in the dashboard, never lower it below this.
 */
export const MIN_MARKUP_PERCENT = 30;
export const DEFAULT_MARKUP_PERCENT = 30;
export const MAX_MARKUP_PERCENT = 1000;

/** Default USD -> MYR conversion. Override with OPENROUTER_USD_MYR_RATE. */
export const DEFAULT_USD_MYR_RATE = 4.7;

export function normalizeMarkupPercent(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_MARKUP_PERCENT;
  return Math.min(MAX_MARKUP_PERCENT, Math.max(MIN_MARKUP_PERCENT, value));
}

export function getUsdMyrRate(): number {
  const raw = Number(process.env.OPENROUTER_USD_MYR_RATE);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_USD_MYR_RATE;
}

/**
 * Partner-facing charge for one AI request, in MYR cents.
 *
 *   charged = cost_usd x (1 + markup/100) x usd_myr_rate x 100
 *
 * Rounded up to the nearest sen so the platform never under-recovers cost.
 */
export function computeChargeCents(
  costUsd: number,
  markupPercent: number,
  usdMyrRate: number,
): number {
  if (!Number.isFinite(costUsd) || costUsd <= 0) return 0;

  const markedUpUsd = costUsd * (1 + normalizeMarkupPercent(markupPercent) / 100);
  const myr = markedUpUsd * usdMyrRate;

  return Math.max(0, Math.ceil(myr * 100));
}

export function formatMyr(cents: number, options: { decimals?: boolean } = {}) {
  const value = cents / 100;
  const showDecimals = options.decimals ?? value % 1 !== 0;

  return `RM${value.toLocaleString("en-MY", {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}
