import type { SponsoredActivationUserEligibilitySource } from '@/lib/schemas/activation-eligibility';

export type ValidEligibilityDeeplink = {
  source: SponsoredActivationUserEligibilitySource;
  sourceRefId: string;
};

/**
 * v1: only `qr_scan` and `checkpoint_checkin` with non-empty `source_ref_id` trigger auto POST.
 */
export function parseSponsoredActivationEligibilityDeeplink(
  source: string | null,
  sourceRefId: string | null
): ValidEligibilityDeeplink | null {
  if (source !== 'qr_scan' && source !== 'checkpoint_checkin') return null;
  const ref = sourceRefId?.trim();
  if (!ref) return null;
  return { source, sourceRefId: ref };
}
