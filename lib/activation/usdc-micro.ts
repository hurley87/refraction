/** Floors a USDC balance to micro-unit precision (6 decimals) for on-chain transfers. */
export function balanceUsdcToMicro(balanceUsdc: number): number {
  return Math.max(0, Math.floor(balanceUsdc * 1e6));
}
