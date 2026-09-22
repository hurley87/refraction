import {
  getSolanaCaddEnvConfig,
  SOLANA_CADD_SYMBOL,
  SolanaCaddConfigError,
  type SolanaCaddAssetConfig,
} from '@/lib/activation/solana-config';
import { fetchSolanaMintDecimals } from '@/lib/activation/solana-token-rpc';

/**
 * Builds the `usdc_asset_config` persisted for a new Solana CADD activation.
 * Precision is read from the mint on-chain; a configured
 * `SPONSORED_ACTIVATION_SOLANA_CADD_DECIMALS` must agree with it, and is only
 * used on its own when the RPC is unreachable.
 */
export async function resolveSolanaCaddSponsoredActivationAssetConfig(): Promise<SolanaCaddAssetConfig> {
  const env = getSolanaCaddEnvConfig();

  let onchainDecimals: number;
  try {
    onchainDecimals = await fetchSolanaMintDecimals({ mint: env.mint });
  } catch (error) {
    if (env.decimals === null) {
      const reason = error instanceof Error ? error.message : 'unknown error';
      throw new SolanaCaddConfigError(
        `Could not verify Solana CADD mint decimals on-chain (${reason}); set SPONSORED_ACTIVATION_SOLANA_CADD_DECIMALS or check the RPC`
      );
    }
    console.warn(
      'resolveSolanaCaddSponsoredActivationAssetConfig: using configured decimals; on-chain verification failed',
      error
    );
    return {
      mint: env.mint,
      decimals: env.decimals,
      symbol: SOLANA_CADD_SYMBOL,
    };
  }

  if (env.decimals !== null && env.decimals !== onchainDecimals) {
    throw new SolanaCaddConfigError(
      `SPONSORED_ACTIVATION_SOLANA_CADD_DECIMALS (${env.decimals}) does not match the on-chain mint decimals (${onchainDecimals})`
    );
  }
  return {
    mint: env.mint,
    decimals: onchainDecimals,
    symbol: SOLANA_CADD_SYMBOL,
  };
}
