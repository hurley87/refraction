/** Numeric USD for public read; non-finite or non-positive values become 0 (two decimal places max). */
export function perkValueUsdFromUsdcAmount(usdcAmount: number): number {
  if (!Number.isFinite(usdcAmount) || usdcAmount <= 0) return 0;
  return Math.round(usdcAmount * 100) / 100;
}

/** Retail-style label from reward `usdc_amount` (not settlement/onchain copy). */
export function formatPerkValueUsdLabel(usdcAmount: number): string {
  const dollars = perkValueUsdFromUsdcAmount(usdcAmount);
  const rounded =
    dollars % 1 === 0
      ? dollars.toFixed(0)
      : dollars.toFixed(2).replace(/\.?0+$/, '');
  return `$${rounded} CADD value`;
}
