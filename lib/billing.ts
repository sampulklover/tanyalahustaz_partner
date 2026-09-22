/** Client-safe billing constants and formatting. No Stripe SDK import here. */

/** Top-up presets in the smallest currency unit (sen for MYR). */
export const TOPUP_PRESETS_MYR = [1000, 2000, 5000, 10000, 20000, 50000] as const;

export const MIN_TOPUP_CENTS = 1000;
export const MAX_TOPUP_CENTS = 1000000;

export function formatMyr(cents: number, options: { decimals?: boolean } = {}) {
  const value = cents / 100;
  const showDecimals = options.decimals ?? value % 1 !== 0;

  return `RM${value.toLocaleString("en-MY", {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}
