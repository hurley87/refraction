import { Horizon, Keypair, Networks } from '@stellar/stellar-sdk';
import { getStellarNetworkConfig } from '@/lib/stellar/utils/network';

/** Circle-issued USDC on Stellar public network (canonical issuer). */
export const STELLAR_PUBLIC_USDC_ISSUER =
  'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';

const STELLAR_SECRET_PREFIX = 'S';
const STELLAR_SECRET_LEN = 56;

function trimEnv(key: string): string {
  return (process.env[key] ?? '').trim();
}

/** Horizon client for spend Stellar flows (readiness + treasury funding). */
export function createStellarSpendHorizonServer(): Horizon.Server {
  const horizonUrl = getStellarSpendHorizonUrl();
  return new Horizon.Server(horizonUrl, {
    allowHttp: horizonUrl.startsWith('http://'),
  });
}

export function getStellarSpendHorizonUrl(): string {
  const fromEnv = trimEnv('NEXT_PUBLIC_STELLAR_HORIZON_URL');
  if (fromEnv) {
    try {
      // eslint-disable-next-line no-new -- URL validates shape
      new URL(fromEnv);
      return fromEnv;
    } catch {
      return getStellarNetworkConfig().horizonUrl;
    }
  }
  return getStellarNetworkConfig().horizonUrl;
}

/**
 * Network passphrase for Stellar classic txs (spend readiness). Prefer explicit
 * `NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE` when set; otherwise map from network name.
 */
export function getStellarSpendNetworkPassphrase(): string {
  const explicit = trimEnv('NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE');
  if (explicit) return explicit;
  const upper = trimEnv('NEXT_PUBLIC_STELLAR_NETWORK').toUpperCase();
  if (upper === 'PUBLIC' || upper === 'MAINNET') {
    return Networks.PUBLIC;
  }
  return Networks.TESTNET;
}

export function getStellarSpendUsdcAssetCode(): string {
  return trimEnv('SPEND_RAIL_STELLAR_USDC_ASSET_CODE') || 'USDC';
}

export function getStellarSpendUsdcIssuer(): string {
  const fromEnv = trimEnv('SPEND_RAIL_STELLAR_USDC_USDC_ISSUER');
  if (fromEnv) return fromEnv;
  const upper = trimEnv('NEXT_PUBLIC_STELLAR_NETWORK').toUpperCase();
  if (upper === 'PUBLIC' || upper === 'MAINNET') {
    return STELLAR_PUBLIC_USDC_ISSUER;
  }
  return '';
}

export function parseStellarSpendSponsorKeypair(): Keypair {
  const secret = trimEnv('SPEND_RAIL_STELLAR_USDC_SPONSOR_SECRET_KEY');
  if (!secret) {
    throw new Error(
      'SPEND_RAIL_STELLAR_USDC_SPONSOR_SECRET_KEY is not configured'
    );
  }
  if (
    !secret.startsWith(STELLAR_SECRET_PREFIX) ||
    secret.length !== STELLAR_SECRET_LEN
  ) {
    throw new Error(
      'SPEND_RAIL_STELLAR_USDC_SPONSOR_SECRET_KEY is not a valid Stellar secret seed'
    );
  }
  try {
    return Keypair.fromSecret(secret);
  } catch {
    throw new Error(
      'SPEND_RAIL_STELLAR_USDC_SPONSOR_SECRET_KEY could not be parsed'
    );
  }
}

/** XLM funded on new accounts so reserves + trustline + fees are covered on public network. */
export function getStellarSpendCreateAccountStartingBalance(): string {
  return trimEnv('SPEND_RAIL_STELLAR_USDC_CREATE_ACCOUNT_XLM') || '3';
}

export function isStellarSpendPublicNetworkRequired(): boolean {
  const upper = trimEnv('NEXT_PUBLIC_STELLAR_NETWORK').toUpperCase();
  return upper === 'PUBLIC' || upper === 'MAINNET';
}

export function collectStellarSpendReadinessConfigReasons(): string[] {
  const reasons: string[] = [];
  if (!isStellarSpendPublicNetworkRequired()) {
    reasons.push(
      'Stellar spend readiness requires NEXT_PUBLIC_STELLAR_NETWORK=PUBLIC (mainnet)'
    );
  }
  const sponsor = trimEnv('SPEND_RAIL_STELLAR_USDC_SPONSOR_SECRET_KEY');
  if (!sponsor) {
    reasons.push('SPEND_RAIL_STELLAR_USDC_SPONSOR_SECRET_KEY is missing');
  } else if (
    !sponsor.startsWith(STELLAR_SECRET_PREFIX) ||
    sponsor.length !== STELLAR_SECRET_LEN
  ) {
    reasons.push(
      'SPEND_RAIL_STELLAR_USDC_SPONSOR_SECRET_KEY is not a valid Stellar secret seed'
    );
  }
  const issuer = getStellarSpendUsdcIssuer();
  if (!issuer) {
    reasons.push(
      'SPEND_RAIL_STELLAR_USDC_USDC_ISSUER is missing (required when not on Stellar public mainnet defaults)'
    );
  }
  return reasons;
}
