import { isAddress } from '@solana/kit';

export type SolanaCluster = 'mainnet-beta' | 'devnet';

export const SOLANA_CADD_SYMBOL = 'CADD';
export const SOLANA_LAMPORTS_PER_SOL = 1_000_000_000;
/** SPL mint decimals are a u8; amounts are converted via JS numbers, so cap at 18 like ERC-20 CADD on Base. */
export const SOLANA_TOKEN_MAX_DECIMALS = 18;

/** Minimum SOL admins should keep on the campaign wallet for fees and ATA rent. */
export const SOLANA_RECOMMENDED_FEE_BALANCE_SOL = 0.05;

const DEFAULT_RPC_URL_BY_CLUSTER: Record<SolanaCluster, string> = {
  'mainnet-beta': 'https://api.mainnet-beta.solana.com',
  devnet: 'https://api.devnet.solana.com',
};

const SOLSCAN_ORIGIN = 'https://solscan.io';

/** Base58 ed25519 signature (64 bytes → 87–88 chars; shorter only with leading zero bytes). */
const SOLANA_SIGNATURE_RE = /^[1-9A-HJ-NP-Za-km-z]{64,88}$/;

export type SolanaCaddAssetConfig = {
  mint: string;
  decimals: number;
  symbol: typeof SOLANA_CADD_SYMBOL;
};

/** Deployment-level CADD settings; `decimals` is null when not pinned in env. */
export type SolanaCaddEnvConfig = {
  mint: string;
  decimals: number | null;
};

/** Thrown when the Solana CADD asset cannot be configured or verified. */
export class SolanaCaddConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SolanaCaddConfigError';
  }
}

/** True for a base58 string that decodes to a 32-byte Solana address. */
export function isSolanaAddress(value: string): boolean {
  return isAddress(value.trim());
}

export function isValidSolanaTokenDecimals(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= SOLANA_TOKEN_MAX_DECIMALS
  );
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
 * The issuer-approved Solana CADD mint for this deployment, or null when unset.
 * There is intentionally no default: the mint must be supplied via
 * `SPONSORED_ACTIVATION_SOLANA_CADD_MINT`.
 */
export function tryGetSolanaCaddMint(): string | null {
  const mint = process.env.SPONSORED_ACTIVATION_SOLANA_CADD_MINT?.trim();
  return mint && isSolanaAddress(mint) ? mint : null;
}

/**
 * Reads and validates the Solana CADD env config. `SPONSORED_ACTIVATION_SOLANA_CADD_DECIMALS`
 * is optional; when set it pins the precision the on-chain mint must match.
 */
export function getSolanaCaddEnvConfig(): SolanaCaddEnvConfig {
  const mint = process.env.SPONSORED_ACTIVATION_SOLANA_CADD_MINT?.trim();
  if (!mint) {
    throw new SolanaCaddConfigError(
      'SPONSORED_ACTIVATION_SOLANA_CADD_MINT is not configured'
    );
  }
  if (!isSolanaAddress(mint)) {
    throw new SolanaCaddConfigError(
      'SPONSORED_ACTIVATION_SOLANA_CADD_MINT is not a valid Solana address'
    );
  }

  const rawDecimals =
    process.env.SPONSORED_ACTIVATION_SOLANA_CADD_DECIMALS?.trim();
  if (!rawDecimals) return { mint, decimals: null };
  const decimals = /^\d+$/.test(rawDecimals) ? Number(rawDecimals) : NaN;
  if (!isValidSolanaTokenDecimals(decimals)) {
    throw new SolanaCaddConfigError(
      `SPONSORED_ACTIVATION_SOLANA_CADD_DECIMALS must be an integer between 0 and ${SOLANA_TOKEN_MAX_DECIMALS}`
    );
  }
  return { mint, decimals };
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
