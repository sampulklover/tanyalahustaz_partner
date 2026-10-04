/**
 * Human-readable USD amount for embedding costs. These are tiny (fractions of a
 * cent), so show enough decimals to stay meaningful without a wall of zeros.
 */
export function formatUsd(amount: number | null | undefined): string {
  if (amount == null || amount < 0) return "—";
  if (amount === 0) return "$0.00";
  if (amount < 0.01) return `$${amount.toFixed(6)}`;
  if (amount < 1) return `$${amount.toFixed(4)}`;
  return `$${amount.toFixed(2)}`;
}
