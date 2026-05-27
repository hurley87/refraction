import { Keypair } from '@stellar/stellar-sdk';
import {
  getStellarSpendUsdcAssetCode,
  getStellarSpendUsdcIssuer,
} from '@/lib/spend/stellar-wallet-readiness-config';

const STELLAR_SECRET_PREFIX = 'S';
const STELLAR_SECRET_LEN = 56;

function trimEnv(key: string): string {
  return (process.env[key] ?? '').trim();
}

function parseStellarSecretFromEnv(envKeys: string[]): Keypair {
  const secret = envKeys.map(trimEnv).find(Boolean);
  if (!secret) {
    throw new Error(
      'SPONSORED_ACTIVATION_STELLAR_CAMPAIGN_SECRET_KEY is not configured'
    );
  }
  if (
    !secret.startsWith(STELLAR_SECRET_PREFIX) ||
    secret.length !== STELLAR_SECRET_LEN
  ) {
    throw new Error(
      'SPONSORED_ACTIVATION_STELLAR_CAMPAIGN_SECRET_KEY is not a valid Stellar secret seed'
    );
  }
  try {
    return Keypair.fromSecret(secret);
  } catch {
    throw new Error(
      'SPONSORED_ACTIVATION_STELLAR_CAMPAIGN_SECRET_KEY could not be parsed'
    );
  }
}

/** Shared Stellar campaign wallet for all sponsored activations (server-signed settlements). */
export function parseStellarSponsoredCampaignKeypair(): Keypair {
  return parseStellarSecretFromEnv([
    'SPONSORED_ACTIVATION_STELLAR_CAMPAIGN_SECRET_KEY',
    'SPEND_RAIL_STELLAR_USDC_TREASURY_SECRET_KEY',
  ]);
}

export function getStellarSponsoredCampaignPublicKey(): string {
  return parseStellarSponsoredCampaignKeypair().publicKey();
}

export function tryGetStellarSponsoredCampaignPublicKey(): string | null {
  try {
    return getStellarSponsoredCampaignPublicKey();
  } catch {
    return null;
  }
}

export function getDefaultStellarSponsoredActivationUsdcAssetConfig(): {
  asset_code: string;
  issuer: string;
} {
  const issuer = getStellarSpendUsdcIssuer();
  if (!issuer) {
    throw new Error(
      'SPEND_RAIL_STELLAR_USDC_USDC_ISSUER is not configured for Stellar sponsored activations'
    );
  }
  return {
    asset_code: getStellarSpendUsdcAssetCode(),
    issuer,
  };
}
