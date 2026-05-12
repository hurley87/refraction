/**
 * Spend pilot eligibility — user-facing copy (PRD §14). Safe to import from client.
 */
export type SpendEligibilityStatus =
  | 'eligible'
  | 'insufficient_points'
  | 'already_converted'
  | 'conversion_in_progress'
  /** Refunded failure: user may explicitly retry conversion (IRL-17). */
  | 'conversion_failed_retryable'
  /** Max explicit retries exhausted; contact support (IRL-17). */
  | 'conversion_failed_retry_exhausted'
  | 'experience_inactive'
  | 'session_expired'
  | 'rail_unavailable'
  | 'conversion_unsupported'
  | 'treasury_insufficient'
  | 'wallet_unavailable'
  | 'ready_for_payment'
  /** Same payment step as `ready_for_payment`, but user already holds enough USDC (no points conversion). */
  | 'ready_for_payment_own_usdc'
  | 'payment_failed'
  | 'payment_complete';

export const SPEND_ELIGIBILITY_MESSAGES: Record<
  SpendEligibilityStatus,
  string
> = {
  eligible: 'You can convert your points to USDC for this event.',
  insufficient_points: 'You do not have enough IRL points for this conversion.',
  already_converted: 'You have already converted for this spend experience.',
  conversion_in_progress:
    'Your conversion is already in progress. Please wait.',
  conversion_failed_retryable:
    'Your points were returned after the last attempt. You can try converting again.',
  conversion_failed_retry_exhausted:
    'This conversion has reached the maximum number of retries. Please contact support for help.',
  experience_inactive:
    'This spend experience is inactive or outside its active window.',
  session_expired: 'This spend session has expired. Scan the event QR again.',
  rail_unavailable:
    'This payment network is temporarily unavailable. Please try again later or ask an event host.',
  conversion_unsupported:
    'Points conversion is not available on this payment network yet. Please ask an event host.',
  treasury_insufficient:
    'The event wallet is temporarily out of USDC. Please try again later or ask an event host.',
  wallet_unavailable:
    'Wallet unavailable. Add or connect your embedded wallet in your profile.',
  ready_for_payment: 'Your points were converted to USDC.',
  ready_for_payment_own_usdc:
    'You have enough USDC in your wallet to complete this payment.',
  payment_failed:
    'Your last payment could not be verified on-chain. You can try sending payment again.',
  payment_complete:
    'Your USDC payment was received. You are all set for this event.',
};

/** Returned when POST conversion/confirm is called without `retry_conversion` while the row is `failed`. */
export const SPEND_CONVERSION_FAILED_REQUIRES_RETRY_ACTION =
  'Your points were returned after the last attempt. Use “Retry conversion” to try again.';
