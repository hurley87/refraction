/**
 * Shared activation lifecycle rules for user redemption flows (IRL-57+).
 */

export type ActivationLifecycleSnapshot = {
  status: string;
  starts_at: string;
  ends_at: string;
};

/**
 * True when the activation is live for user eligibility / confirm / swipe flows.
 * Requires `active` status and `starts_at <= now < ends_at`.
 */
export function canActivationAcceptUserRedemptionFlow(
  activation: ActivationLifecycleSnapshot,
  now: Date = new Date()
): boolean {
  if (activation.status !== 'active') return false;
  const t = now.getTime();
  const startMs = new Date(activation.starts_at).getTime();
  const endMs = new Date(activation.ends_at).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return false;
  return startMs <= t && t < endMs;
}
