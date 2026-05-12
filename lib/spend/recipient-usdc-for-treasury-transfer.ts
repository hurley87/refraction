/**
 * Treasury- or server-wallet-funded USDC targets the session embedded wallet. If the session
 * wallet equals the funding server wallet (misconfiguration), fall back to the authenticated
 * user's normalized embedded address.
 */
export function recipientUsdcAddressForSpendTransfer(params: {
  serverWalletAddress: string;
  sessionWalletTrimmed: string;
  normalizedWalletLower: string;
}): `0x${string}` {
  const serverWalletLower = params.serverWalletAddress.trim().toLowerCase();
  const sessionLower = params.sessionWalletTrimmed.toLowerCase();
  if (serverWalletLower === sessionLower) {
    return params.normalizedWalletLower as `0x${string}`;
  }
  return params.sessionWalletTrimmed as `0x${string}`;
}
