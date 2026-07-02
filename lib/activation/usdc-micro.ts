/** Floors a token balance to smallest-unit precision for on-chain transfers. */
export function balanceToTokenMicro(balance: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.max(0, Math.floor(balance * factor));
}

export function tokenMicroToAmount(micro: number, decimals: number): number {
  return micro / 10 ** decimals;
}

/** Floors a USDC balance to micro-unit precision (6 decimals) for on-chain transfers. */
export function balanceUsdcToMicro(balanceUsdc: number): number {
  return balanceToTokenMicro(balanceUsdc, 6);
}
