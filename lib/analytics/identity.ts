/**
 * Identity resolution for Mixpanel distinct_id
 * Determines the best distinct_id to use based on available user identifiers
 */

export type IdentitySource = 'email' | 'privy' | 'wallet' | 'player';

export interface IdentityInput {
  email?: string;
  privyUserId?: string;
  walletAddress?: string;
  playerId?: string | number;
}

export interface IdentityResult {
  distinctId: string;
  identitySource: IdentitySource;
}

/**
 * Resolves the best distinct_id for Mixpanel tracking
 * Priority: email > privyUserId > walletAddress > playerId
 *
 * @param input - Available user identifiers
 * @returns The resolved distinct_id and its source
 * @throws Error if no valid identifier is provided
 */
export function resolveDistinctId(input: IdentityInput): IdentityResult {
  // Normalize email: trim, lowercase, ignore empty strings
  const normalizedEmail =
    input.email
      ?.trim()
      .toLowerCase()
      .replace(/^\s+|\s+$/g, '') || undefined;
  if (normalizedEmail && normalizedEmail.length > 0) {
    return {
      distinctId: normalizedEmail,
      identitySource: 'email',
    };
  }

  // Fallback to Privy user ID if available
  const privyId = input.privyUserId?.trim();
  if (privyId && privyId.length > 0) {
    return {
      distinctId: privyId,
      identitySource: 'privy',
    };
  }

  // Fallback to wallet address
  const wallet = input.walletAddress?.trim();
  if (wallet && wallet.length > 0) {
    return {
      distinctId: wallet,
      identitySource: 'wallet',
    };
  }

  // Fallback to player ID (convert to string)
  if (input.playerId !== undefined && input.playerId !== null) {
    return {
      distinctId: String(input.playerId),
      identitySource: 'player',
    };
  }

  // No valid identifier found
  throw new Error(
    'No valid identifier provided for Mixpanel distinct_id. At least one of email, privyUserId, walletAddress, or playerId must be provided.'
  );
}
