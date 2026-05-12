import { Keypair } from '@stellar/stellar-sdk';
import { stellarWalletAddressSchema } from '@/lib/schemas/player';

const STELLAR_SECRET_PREFIX = 'S';
const STELLAR_SECRET_LEN = 56;

function trimEnv(key: string): string {
  return (process.env[key] ?? '').trim();
}

/**
 * Parses a trimmed Stellar secret seed for treasury USDC funding (IRL-16).
 * Distinct from the sponsor key used for readiness (IRL-18).
 */
export function parseStellarTreasuryFundingKeypairFromSecret(
  secret: string
): Keypair {
  const t = secret.trim();
  if (!t) {
    throw new Error(
      'SPEND_RAIL_STELLAR_USDC_TREASURY_SECRET_KEY is not configured'
    );
  }
  if (!t.startsWith(STELLAR_SECRET_PREFIX) || t.length !== STELLAR_SECRET_LEN) {
    throw new Error(
      'SPEND_RAIL_STELLAR_USDC_TREASURY_SECRET_KEY is not a valid Stellar secret seed'
    );
  }
  try {
    return Keypair.fromSecret(t);
  } catch {
    throw new Error(
      'SPEND_RAIL_STELLAR_USDC_TREASURY_SECRET_KEY could not be parsed'
    );
  }
}

export function parseStellarTreasuryFundingKeypair(): Keypair {
  return parseStellarTreasuryFundingKeypairFromSecret(
    trimEnv('SPEND_RAIL_STELLAR_USDC_TREASURY_SECRET_KEY')
  );
}

/**
 * Validates treasury funding secrets against the resolved treasury public address
 * (treasury env or receiving fallback). Used by spend rail operational diagnostics.
 */
export function collectStellarTreasuryFundingConfigReasons(input: {
  treasuryPublicAddressTrimmed: string;
}): string[] {
  const reasons: string[] = [];
  const pub = input.treasuryPublicAddressTrimmed;
  if (!pub) {
    reasons.push(
      'Stellar treasury funding requires SPEND_RAIL_STELLAR_USDC_TREASURY_ADDRESS or SPEND_RAIL_STELLAR_USDC_RECEIVING_ADDRESS'
    );
    return reasons;
  }
  const pubOk = stellarWalletAddressSchema.safeParse(pub);
  if (!pubOk.success) {
    reasons.push(
      'Resolved Stellar treasury public address is not a valid strkey'
    );
    return reasons;
  }

  const secretRaw = trimEnv('SPEND_RAIL_STELLAR_USDC_TREASURY_SECRET_KEY');
  if (!secretRaw) {
    reasons.push('SPEND_RAIL_STELLAR_USDC_TREASURY_SECRET_KEY is missing');
    return reasons;
  }
  try {
    const kp = parseStellarTreasuryFundingKeypairFromSecret(secretRaw);
    if (kp.publicKey() !== pub) {
      reasons.push(
        'SPEND_RAIL_STELLAR_USDC_TREASURY_SECRET_KEY does not match the configured Stellar treasury public address'
      );
    }
  } catch (e) {
    reasons.push(
      e instanceof Error
        ? e.message
        : 'Invalid Stellar treasury secret configuration'
    );
  }
  return reasons;
}
