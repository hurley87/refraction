import { isAddress } from '@solana/kit';

export type SolanaCluster = 'mainnet-beta' | 'devnet';

export const SOLANA_USDC_SYMBOL = 'USDC';
export const SOLANA_USDC_DECIMALS = 6;
export const SOLANA_LAMPORTS_PER_SOL = 1_000_000_000;

/** Minimum SOL admins should keep on the campaign wallet for fees and ATA rent. */
export const SOLANA_RECOMMENDED_FEE_BALANCE_SOL = 0.05;

/** Circle-issued USDC mints per cluster. */
export const SOLANA_USDC_MINT_BY_CLUSTER: Record<SolanaCluster, string> = {
  'mainnet-beta': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  devnet: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
};

const DEFAULT_RPC_URL_BY_CLUSTER: Record<SolanaCluster, string> = {
  'mainnet-beta': 'https://api.mainnet-beta.solana.com',
  devnet: 'https://api.devnet.solana.com',
};

const SOLSCAN_ORIGIN = 'https://solscan.io';

/** Base58 ed25519 signature (64 bytes → 87–88 chars; shorter only with leading zero bytes). */
const SOLANA_SIGNATURE_RE = /^[1-9A-HJ-NP-Za-km-z]{64,88}$/;

export type SolanaUsdcAssetConfig = {
  mint: string;
  decimals: number;
  symbol: typeof SOLANA_USDC_SYMBOL;
};

/** True for a base58 string that decodes to a 32-byte Solana address. */
export function isSolanaAddress(value: string): boolean {
  return isAddress(value.trim());
}

export function getSolanaCluster(): SolanaCluster {
  return process.env.SPONSORED_ACTIVATION_SOLANA_CLUSTER?.trim() === 'devnet'
    ? 'devnet'
    : 'mainnet-beta';
}

export function getSolanaRpcUrl(): string {
  return (
    process.env.SPONSORED_ACTIVATION_SOLANA_RPC_URL?.trim() ||
    DEFAULT_RPC_URL_BY_CLUSTER[getSolanaCluster()]
  );
}

/**
 * The one USDC mint Solana sponsored activations settle in. Defaults to Circle
 * USDC for the configured cluster; `SPONSORED_ACTIVATION_SOLANA_USDC_MINT`
 * overrides it (must be a valid Solana address).
 */
export function getSolanaUsdcMint(): string {
  const override = process.env.SPONSORED_ACTIVATION_SOLANA_USDC_MINT?.trim();
  if (override) {
    if (!isSolanaAddress(override)) {
      throw new Error(
        'SPONSORED_ACTIVATION_SOLANA_USDC_MINT is not a valid Solana address'
      );
    }
    return override;
  }
  return SOLANA_USDC_MINT_BY_CLUSTER[getSolanaCluster()];
}

export function getDefaultSolanaSponsoredActivationAssetConfig(): SolanaUsdcAssetConfig {
  return {
    mint: getSolanaUsdcMint(),
    decimals: SOLANA_USDC_DECIMALS,
    symbol: SOLANA_USDC_SYMBOL,
  };
}

function solscanClusterQuery(): string {
  return getSolanaCluster() === 'devnet' ? '?cluster=devnet' : '';
}

export function getSolscanTxUrlTemplate(): string {
  return `${SOLSCAN_ORIGIN}/tx/{txHash}${solscanClusterQuery()}`;
}

export function formatSolscanTxUrl(
  signature: string | null | undefined
): string | null {
  const raw = signature?.trim();
  if (!raw || !SOLANA_SIGNATURE_RE.test(raw)) return null;
  return getSolscanTxUrlTemplate().replace('{txHash}', raw);
}

export function formatSolscanAccountUrl(
  address: string | null | undefined
): string | null {
  const raw = address?.trim();
  if (!raw || !isSolanaAddress(raw)) return null;
  return `${SOLSCAN_ORIGIN}/account/${raw}${solscanClusterQuery()}`;
}
