import { describe, it, expect } from 'vitest';
import {
  isStellarReadinessSubmittedMetadataStale,
  STELLAR_WALLET_READINESS_STALE_SUBMITTED_MS,
} from '@/lib/spend/stellar-wallet-readiness-stale';

describe('isStellarReadinessSubmittedMetadataStale', () => {
  it('returns false when no submitted timestamps exist', () => {
    expect(isStellarReadinessSubmittedMetadataStale({}, 1_000_000_000)).toBe(
      false
    );
  });

  it('returns true when oldest submitted timestamp exceeds stale window', () => {
    const t0 = new Date('2026-01-01T00:00:00.000Z').getTime();
    expect(
      isStellarReadinessSubmittedMetadataStale(
        {
          activation_tx_submitted_at: new Date(
            t0 - STELLAR_WALLET_READINESS_STALE_SUBMITTED_MS - 60_000
          ).toISOString(),
        },
        t0
      )
    ).toBe(true);
  });

  it('returns false just inside the stale window', () => {
    const t0 = new Date('2026-01-01T12:00:00.000Z').getTime();
    expect(
      isStellarReadinessSubmittedMetadataStale(
        {
          trustline_tx_submitted_at: new Date(
            t0 - STELLAR_WALLET_READINESS_STALE_SUBMITTED_MS + 5_000
          ).toISOString(),
        },
        t0
      )
    ).toBe(false);
  });
});
