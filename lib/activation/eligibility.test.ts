import { describe, it, expect } from 'vitest';
import type { Tier } from '@/lib/types';
import {
  buildActivationRedemptionIdempotencyKey,
  checkEligibilityEventRateLimits,
  computePlayerTierRank,
  evaluateEligibilityBusinessRules,
  userHasBlockingRedemptionForRewardItem,
} from '@/lib/activation/eligibility';

const tiersAsc: Tier[] = [
  {
    id: 't1',
    title: 'Bronze',
    min_points: 0,
    max_points: 100,
    description: '',
    created_at: '',
    updated_at: '',
  },
  {
    id: 't2',
    title: 'Silver',
    min_points: 100,
    max_points: null,
    description: '',
    created_at: '',
    updated_at: '',
  },
];

const baseConfig = {
  max_events_per_user: 5,
  max_events_per_user_per_day: 3,
  required_checkpoint_ids: ['cp-1', 'cp-2'],
};

describe('evaluateEligibilityBusinessRules', () => {
  it('requires checkpoint ref when source is checkpoint_checkin', () => {
    const bad = evaluateEligibilityBusinessRules({
      config: baseConfig,
      source: 'checkpoint_checkin',
      sourceRefId: 'unknown',
      tiersSortedAsc: tiersAsc,
      playerTotalPoints: 50,
    });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.reason).toBe('checkpoint_requirement_not_met');

    const ok = evaluateEligibilityBusinessRules({
      config: baseConfig,
      source: 'checkpoint_checkin',
      sourceRefId: 'cp-1',
      tiersSortedAsc: tiersAsc,
      playerTotalPoints: 50,
    });
    expect(ok.ok).toBe(true);
  });

  it('does not enforce checkpoint list for qr_scan', () => {
    const r = evaluateEligibilityBusinessRules({
      config: { ...baseConfig, required_checkpoint_ids: [] },
      source: 'qr_scan',
      sourceRefId: 'any-qr',
      tiersSortedAsc: tiersAsc,
      playerTotalPoints: 0,
    });
    expect(r.ok).toBe(true);
  });

  it('enforces min_tier when present', () => {
    const needTier2 = evaluateEligibilityBusinessRules({
      config: { ...baseConfig, min_tier: 2 },
      source: 'qr_scan',
      sourceRefId: 'x',
      tiersSortedAsc: tiersAsc,
      playerTotalPoints: 50,
    });
    expect(needTier2.ok).toBe(false);

    const ok = evaluateEligibilityBusinessRules({
      config: { ...baseConfig, min_tier: 2 },
      source: 'qr_scan',
      sourceRefId: 'x',
      tiersSortedAsc: tiersAsc,
      playerTotalPoints: 150,
    });
    expect(ok.ok).toBe(true);
  });
});

describe('computePlayerTierRank', () => {
  it('returns 1-based index aligned with sorted tiers', () => {
    expect(computePlayerTierRank(tiersAsc, 0)).toBe(1);
    expect(computePlayerTierRank(tiersAsc, 100)).toBe(2);
  });
});

describe('checkEligibilityEventRateLimits', () => {
  it('flags lifetime when count already at cap', () => {
    expect(
      checkEligibilityEventRateLimits({
        config: baseConfig,
        lifetimeCountBeforeInsert: 5,
        dailyCountBeforeInsert: 0,
      })
    ).toBe('lifetime_exceeded');
  });

  it('flags daily when count already at cap', () => {
    expect(
      checkEligibilityEventRateLimits({
        config: baseConfig,
        lifetimeCountBeforeInsert: 0,
        dailyCountBeforeInsert: 3,
      })
    ).toBe('daily_exceeded');
  });

  it('allows when under both caps', () => {
    expect(
      checkEligibilityEventRateLimits({
        config: baseConfig,
        lifetimeCountBeforeInsert: 2,
        dailyCountBeforeInsert: 1,
      })
    ).toBe('ok');
  });
});

describe('userHasBlockingRedemptionForRewardItem', () => {
  it('returns true when a non-terminal redemption exists for the item', () => {
    expect(
      userHasBlockingRedemptionForRewardItem(
        [
          {
            reward_item_id: 'ri-1',
            status: 'available',
          },
        ],
        'ri-1'
      )
    ).toBe(true);
    expect(
      userHasBlockingRedemptionForRewardItem(
        [{ reward_item_id: 'ri-1', status: 'redeemed' }],
        'ri-1'
      )
    ).toBe(false);
  });
});

describe('buildActivationRedemptionIdempotencyKey', () => {
  it('joins activation id, player id, and reward item id', () => {
    expect(
      buildActivationRedemptionIdempotencyKey({
        activationId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        playerId: 42,
        rewardItemId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      })
    ).toBe(
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee:42:bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    );
  });
});
