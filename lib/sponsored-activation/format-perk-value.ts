/**
 * User-facing retail value label for sponsored activation reward items (Figma: "$9 USD value").
 * Derived from backend `usdc_amount`; not shown as crypto or settlement copy.
 */
export function formatPerkValueUsdLabel(usdcAmount: number): string {
  const dollars = Number.isFinite(usdcAmount) ? usdcAmount : 0;
  const rounded =
    dollars % 1 === 0
      ? dollars.toFixed(0)
      : dollars.toFixed(2).replace(/\.?0+$/, '');
  return `$${rounded} USD value`;
}

/** Whole-dollar display amount for public read (no chain/settlement semantics). */
export function perkValueUsdFromUsdcAmount(usdcAmount: number): number {
  if (!Number.isFinite(usdcAmount) || usdcAmount <= 0) return 0;
  return Math.round(usdcAmount * 100) / 100;
}
