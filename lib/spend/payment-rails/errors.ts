/**
 * Sanitized analytics identifiers for spend rails (snake_case, stable, no secrets).
 * Downstream analytics (e.g. IRL-23) should reference these constants only.
 */
export const SPEND_RAIL_ANALYTICS_CODES = {
  wallet_unavailable: 'spend_rail_wallet_unavailable',
  treasury_insufficient_funds: 'spend_rail_treasury_insufficient_funds',
  wallet_readiness_failed: 'spend_rail_wallet_readiness_failed',
  funding_failed: 'spend_rail_funding_failed',
  payment_failed: 'spend_rail_payment_failed',
  network_unavailable: 'spend_rail_network_unavailable',
  invalid_receiving_wallet: 'spend_rail_invalid_receiving_wallet',
  duplicate_request: 'spend_rail_duplicate_request',
  rail_operation_not_supported: 'spend_rail_operation_not_supported',
} as const;

export type SpendRailAnalyticsCode =
  (typeof SPEND_RAIL_ANALYTICS_CODES)[keyof typeof SPEND_RAIL_ANALYTICS_CODES];

export type SpendRailErrorCategory =
  | 'wallet_unavailable'
  | 'treasury_insufficient_funds'
  | 'wallet_readiness_failed'
  | 'funding_failed'
  | 'payment_failed'
  | 'network_unavailable'
  | 'invalid_receiving_wallet'
  | 'duplicate_request'
  | 'rail_operation_not_supported';

/**
 * Categorized rail error safe for API responses (user copy) and analytics (sanitized code).
 */
export type SpendRailError = {
  category: SpendRailErrorCategory;
  userMessage: string;
  analyticsCode: SpendRailAnalyticsCode;
};

const err = (
  category: SpendRailErrorCategory,
  userMessage: string,
  analyticsCode: SpendRailAnalyticsCode
): SpendRailError => ({ category, userMessage, analyticsCode });

/** User wallet is missing or cannot be used for this operation. */
export const spendRailErrorWalletUnavailable = (): SpendRailError =>
  err(
    'wallet_unavailable',
    'Your wallet is not available for this step. Reconnect your wallet and try again.',
    SPEND_RAIL_ANALYTICS_CODES.wallet_unavailable
  );

/** Treasury cannot cover the requested funding amount. */
export const spendRailErrorTreasuryInsufficientFunds = (): SpendRailError =>
  err(
    'treasury_insufficient_funds',
    'This experience cannot fund your balance right now. Please try again later.',
    SPEND_RAIL_ANALYTICS_CODES.treasury_insufficient_funds
  );

/** Server-driven wallet readiness (e.g. account prep) did not complete successfully. */
export const spendRailErrorWalletReadinessFailed = (): SpendRailError =>
  err(
    'wallet_readiness_failed',
    'Your wallet could not be set up for payments on this network. Please try again or contact support.',
    SPEND_RAIL_ANALYTICS_CODES.wallet_readiness_failed
  );

/** Treasury → user funding failed or could not be verified. */
export const spendRailErrorFundingFailed = (): SpendRailError =>
  err(
    'funding_failed',
    'Funding your balance did not complete. You can try again from the start of the flow.',
    SPEND_RAIL_ANALYTICS_CODES.funding_failed
  );

/** Payment submission or on-chain verification failed. */
export const spendRailErrorPaymentFailed = (): SpendRailError =>
  err(
    'payment_failed',
    'Payment could not be verified. If funds left your wallet, contact support with your transaction hash.',
    SPEND_RAIL_ANALYTICS_CODES.payment_failed
  );

/** Upstream network or provider unavailable. */
export const spendRailErrorNetworkUnavailable = (): SpendRailError =>
  err(
    'network_unavailable',
    'This payment network is temporarily unavailable. Please try again later.',
    SPEND_RAIL_ANALYTICS_CODES.network_unavailable
  );

/** Configured receiving/settlement address is invalid for the rail. */
export const spendRailErrorInvalidReceivingWallet = (): SpendRailError =>
  err(
    'invalid_receiving_wallet',
    'Invalid receiving wallet configuration.',
    SPEND_RAIL_ANALYTICS_CODES.invalid_receiving_wallet
  );

/** Idempotent replay detected a conflicting in-flight request. */
export const spendRailErrorDuplicateRequest = (): SpendRailError =>
  err(
    'duplicate_request',
    'This request was already processed. Please refresh and continue.',
    SPEND_RAIL_ANALYTICS_CODES.duplicate_request
  );

/**
 * Operation is not implemented for this rail in the current release (non-leaky copy for clients).
 */
export const spendRailErrorRailOperationNotSupported = (): SpendRailError =>
  err(
    'rail_operation_not_supported',
    'USDC payment verification on this network is not available in this release.',
    SPEND_RAIL_ANALYTICS_CODES.rail_operation_not_supported
  );

/** Treasury→user points conversion funding is not implemented for this rail (IRL-20). */
export const spendRailErrorConversionFundingNotSupported = (): SpendRailError =>
  err(
    'rail_operation_not_supported',
    'Points-to-USDC conversion is not available on this payment network yet. Please ask an event host.',
    SPEND_RAIL_ANALYTICS_CODES.rail_operation_not_supported
  );

export function isSpendRailError(value: unknown): value is SpendRailError {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.category === 'string' &&
    typeof v.userMessage === 'string' &&
    typeof v.analyticsCode === 'string'
  );
}

/** HTTP status for surfacing a rail error to clients (conversion / payment routes). */
export function spendRailErrorCategoryToHttpStatus(
  category: SpendRailErrorCategory
): 400 | 500 {
  return category === 'network_unavailable' ? 500 : 400;
}
