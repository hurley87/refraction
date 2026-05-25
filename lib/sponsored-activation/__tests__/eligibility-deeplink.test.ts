import { describe, it, expect } from 'vitest';
import { parseSponsoredActivationEligibilityDeeplink } from '@/lib/sponsored-activation/eligibility-deeplink';

describe('parseSponsoredActivationEligibilityDeeplink', () => {
  it('accepts qr_scan with ref', () => {
    expect(
      parseSponsoredActivationEligibilityDeeplink('qr_scan', 'abc')
    ).toEqual({ source: 'qr_scan', sourceRefId: 'abc' });
  });

  it('rejects invalid source', () => {
    expect(
      parseSponsoredActivationEligibilityDeeplink('nfc', 'abc')
    ).toBeNull();
  });

  it('rejects empty ref', () => {
    expect(
      parseSponsoredActivationEligibilityDeeplink('qr_scan', '  ')
    ).toBeNull();
  });
});
