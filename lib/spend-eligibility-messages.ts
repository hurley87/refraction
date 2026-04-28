/**
 * Spend pilot eligibility — user-facing copy (PRD §14). Safe to import from client.
 */
export type SpendEligibilityStatus =
  | 'eligible'
  | 'insufficient_points'
  | 'already_converted'
  | 'conversion_in_progress'
  | 'experience_inactive'
  | 'session_expired'
  | 'treasury_insufficient'
  | 'wallet_unavailable'
  | 'ready_for_payment'
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
  experience_inactive:
    'This spend experience is inactive or outside its active window.',
  session_expired: 'This spend session has expired. Scan the event QR again.',
  treasury_insufficient:
    'The event wallet is temporarily out of USDC. Please try again later or ask an event host.',
  wallet_unavailable:
    'Wallet unavailable. Add or connect your embedded wallet in your profile.',
  ready_for_payment: 'Your points were converted to USDC.',
  payment_failed:
    'Your last payment could not be verified on-chain. You can try sending payment again.',
  payment_complete:
    'Your USDC payment was received. You are all set for this event.',
};
